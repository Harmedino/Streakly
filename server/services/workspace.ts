import { stats } from '../../src/app/core/streaks';
import { todayKey } from '../../src/app/core/dates';
import { Workspace } from '../models/index';
import mongoose, { Schema } from 'mongoose';
import { ApiError } from '../middleware/errors';
import { AppData, emptyData } from '../../src/app/models/tracker';
import { validateData } from '../../src/app/core/data-validation';
import { reconcileAutomation } from '../../src/app/core/automation';
import { syncLearning } from '../../src/app/core/learning';
import { emptyLife } from '../../src/app/models/life';
import { digest } from './auth';
export const Backup = mongoose.model(
  'Backup',
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, index: true, required: true },
      data: { type: Schema.Types.Mixed, required: true },
      reason: { type: String, required: true },
    },
    { timestamps: true, minimize: false },
  ),
);
export const sections = [
  'activities',
  'completions',
  'todos',
  'accounts',
  'transactions',
  'income',
  'expenses',
  'recurring',
  'budgets',
  'savingsGoals',
  'contributions',
  'targets',
  'learning',
  'jobs',
  'goals',
  'journal',
] as const;
export async function load(owner: string) {
  const doc = await Workspace.findOne({ userId: owner });
  if (!doc) throw new ApiError(404, 'WORKSPACE_MISSING', 'Workspace not found.');
  return doc;
}
export function prepare(raw: unknown, previous?: AppData, preserveCredits = false): AppData {
  const d = structuredClone(raw) as AppData;
  if (previous && !preserveCredits) d.autoCredits = structuredClone(previous.autoCredits ?? []);
  if (d.life && Array.isArray(d.life.learning) && Array.isArray(d.activities)) {
    const pairs = [...(previous?.life?.learning ?? []), ...d.life.learning]
      .filter((e) => e.activityId && d.activities.some((a) => a.id === e.activityId))
      .map((e) => ({ activityId: e.activityId, date: e.date }));
    syncLearning(d, pairs);
    for (const e of d.life.learning) {
      const old = previous?.life?.learning.find((x) => x.id === e.id);
      e.createdAt = old?.createdAt || e.createdAt || new Date().toISOString();
      e.updatedAt =
        old &&
        JSON.stringify({ ...old, updatedAt: undefined }) ===
          JSON.stringify({ ...e, updatedAt: undefined })
          ? old.updatedAt
          : new Date().toISOString();
    }
  }
  reconcileAutomation(d);
  if (previous)
    for (const a of d.activities) {
      const count = stats(a, d.completions, todayKey(d.preferences.timeZone)).current;
      const key = a.id + ':' + count;
      if ([3, 7, 14, 30, 50, 100, 365].includes(count) && !d.milestones.includes(key))
        d.milestones.push(key);
    }

  try {
    return validateData(d);
  } catch (error) {
    throw new ApiError(
      422,
      'VALIDATION',
      error instanceof Error ? error.message : 'Review the record.',
    );
  }
}
export async function commit(
  owner: string,
  revision: number,
  raw: unknown,
  reason?: string,
  migrationHash?: string,
) {
  const current = await load(owner);
  if (migrationHash && current.migrationHashes.includes(migrationHash))
    return current.data as AppData;
  if (current.revision !== revision)
    throw new ApiError(
      409,
      'REVISION_CONFLICT',
      'Your workspace changed on another device. Reload the latest data before retrying; your form is still here.',
    );
  let next: AppData;
  try {
    next = prepare(
      raw,
      current.data as AppData,
      reason === 'restore' || reason === 'before-migration',
    );
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      422,
      'VALIDATION',
      e instanceof Error ? e.message : 'Review the submitted workspace.',
    );
  }
  const primaryCount = (data: AppData) =>
    data.activities.length +
    (data.todos?.length ?? 0) +
    Object.entries(data.life!)
      .filter(
        ([key]) =>
          !['learningCredits', 'goalEvents', 'incomeCategories', 'expenseCategories'].includes(key),
      )
      .reduce((n, [, rows]) => n + (Array.isArray(rows) ? rows.length : 0), 0);
  if (
    primaryCount(current.data as AppData) > 1 &&
    primaryCount(next) === 0 &&
    !reason?.startsWith('before-reset-') &&
    reason !== 'before-clear-completed'
  )
    throw new ApiError(
      422,
      'BULK_CONFIRMATION',
      'Use the protected section reset or type RESET in Reset All before clearing this workspace.',
    );
  next.revision = revision + 1;
  if (
    (next.preferences.currency ?? 'NGN') !==
      ((current.data as AppData).preferences.currency ?? 'NGN') &&
    ((current.data as AppData).life!.transactions.length ||
      (current.data as AppData).life!.accounts.length)
  )
    throw new ApiError(
      422,
      'CURRENCY',
      'Export and reset Finance before changing ledger currency. Existing money cannot be re-labelled as another currency.',
    );
  if (Buffer.byteLength(JSON.stringify(next)) > 8 * 1024 * 1024)
    throw new ApiError(
      413,
      'WORKSPACE_LIMIT',
      'This workspace exceeds 8 MB. Export and split large notes before retrying.',
    );
  if (reason) await Backup.create({ userId: owner, data: current.data, reason });
  const result = await Workspace.findOneAndUpdate(
    { userId: owner, revision },
    {
      $set: { data: next, ...(reason === 'before-reset-all' ? { draft: null } : {}) },
      $inc: { revision: 1, ...(reason === 'before-reset-all' ? { draftEpoch: 1 } : {}) },
      ...(migrationHash ? { $addToSet: { migrationHashes: migrationHash } } : {}),
    },
    { returnDocument: 'after' },
  );
  if (!result)
    throw new ApiError(409, 'REVISION_CONFLICT', 'Another device saved first. Reload and retry.');
  return result.data as AppData;
}
export function resetData(raw: AppData, section: string) {
  const d = structuredClone(raw),
    l = d.life!;
  if (section === 'all') {
    const fresh = emptyData();
    fresh.preferences = { ...d.preferences };
    return fresh;
  }
  if (section === 'finance') {
    const fresh = emptyLife();
    for (const key of [
      'accounts',
      'transactions',
      'recurring',
      'budgets',
      'savingsGoals',
      'contributions',
      'targets',
      'incomeCategories',
      'expenseCategories',
    ] as const)
      (l as any)[key] = fresh[key];
    for (const g of l.goals) g.savingsId = '';
  } else if (section === 'learning') {
    const pairs = l.learningCredits.map((c) => ({ activityId: c.activityId, date: c.date }));
    l.learning = [];
    syncLearning(d, pairs);
    for (const g of l.goals) g.learningCategory = '';
  } else if (section === 'streaks') {
    d.activities = [];
    d.completions = [];
    d.milestones = [];
    d.autoCredits = [];
    l.learningCredits = [];
    for (const e of l.learning) e.activityId = '';
    for (const g of l.goals) g.activityId = '';
  } else if (section === 'goals') {
    l.goals = [];
    l.goalEvents = [];
  } else if (section === 'journal') {
    l.journal = [];
    d.dailyNotes = {};
  } else if (section === 'planner') d.todos = [];
  else if (section === 'jobs') l.jobs = [];
  else throw new ApiError(422, 'SECTION', 'Choose a valid section.');
  return d;
}
export function mergeLegacy(current: AppData, incoming: AppData) {
  const result = structuredClone(current);
  for (const key of ['activities', 'todos'] as const) {
    const rows = (result[key] ??= []);
    for (const row of incoming[key] ?? []) {
      const existing = rows.find((r) => r.id === row.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(row))
        throw new ApiError(
          409,
          'MIGRATION_CONFLICT',
          `A ${key} record already exists with ID ${row.id}. Export both versions before resolving this conflict.`,
        );
      if (!existing) (rows as any[]).push(row);
    }
  }
  for (const key of Object.keys(incoming.life!) as (keyof NonNullable<AppData['life']>)[]) {
    const rows = incoming.life![key];
    if (!Array.isArray(rows)) continue;
    if (['incomeCategories', 'expenseCategories'].includes(key)) {
      (result.life as any)[key] = [...new Set([...(result.life as any)[key], ...rows])];
      continue;
    }
    for (const row of rows as any[]) {
      const list = ((result.life as any)[key] ??= []) as any[];
      const identity = (v: any) => v.id ?? v.activityId + ':' + v.date;
      const found = list.find((r) => identity(r) === identity(row));
      if (found && JSON.stringify(found) !== JSON.stringify(row))
        throw new ApiError(
          409,
          'MIGRATION_CONFLICT',
          `Conflicting ${key} record ${identity(row)}. Nothing was imported.`,
        );
      if (!found) list.push(row);
    }
  }
  for (const e of incoming.completions) {
    const found = result.completions.find(
      (r) => r.activityId === e.activityId && r.date === e.date,
    );
    if (found && JSON.stringify(found) !== JSON.stringify(e))
      throw new ApiError(
        409,
        'MIGRATION_CONFLICT',
        'A completion has conflicting progress. Nothing was imported.',
      );
    if (!found) result.completions.push(e);
  }
  for (const credit of incoming.autoCredits ?? []) {
    const rows = (result.autoCredits ??= []);
    const existing = rows.find((c) => c.activityId === credit.activityId && c.date === credit.date);
    if (existing && JSON.stringify(existing) !== JSON.stringify(credit))
      throw new ApiError(
        409,
        'MIGRATION_CONFLICT',
        'Conflicting automatic streak history. Nothing was imported.',
      );
    if (!existing) rows.push(credit);
  }
  for (const [date, note] of Object.entries(incoming.dailyNotes ?? {})) {
    if (result.dailyNotes?.[date] && result.dailyNotes[date] !== note)
      throw new ApiError(409, 'MIGRATION_CONFLICT', 'Conflicting daily note for ' + date);
    (result.dailyNotes ??= {})[date] = note;
  }
  result.categories = [...new Set([...result.categories, ...incoming.categories])];
  result.milestones = [...new Set([...result.milestones, ...incoming.milestones])];
  if (!result.preferences.name) result.preferences = { ...incoming.preferences, onboarded: true };
  return result;
}
export const migrationFingerprint = (raw: unknown) => digest(JSON.stringify(raw));
