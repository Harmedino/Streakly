import { recordDefaults } from '../services/defaults';
import { Router } from 'express';
import { z } from 'zod';
import { protect, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errors';
import {
  load,
  commit,
  sections,
  resetData,
  Backup,
  mergeLegacy,
  migrationFingerprint,
} from '../services/workspace';
import { validateData } from '../../src/app/core/data-validation';
import { lifeReport } from '../../src/app/core/life-reports';
import { dayDistance, validDate } from '../../src/app/core/dates';
import type { AppData } from '../../src/app/models/tracker';
export const workspace = Router();
workspace.use(protect);
const revision = z.number().int().nonnegative();
workspace.get('/workspace', async (req: AuthRequest, res) =>
  res.json({ ok: true, data: (await load(req.owner!)).data }),
);
workspace.put('/workspace', async (req: AuthRequest, res) => {
  const body = z
    .object({ expectedRevision: revision, data: z.unknown(), backup: z.boolean().optional() })
    .strict()
    .parse(req.body);
  res.json({
    ok: true,
    data: await commit(
      req.owner!,
      body.expectedRevision,
      body.data,
      body.backup ? 'restore' : undefined,
    ),
  });
});
workspace.get('/migration/status', async (req: AuthRequest, res) =>
  res.json({ ok: true, data: { completed: (await load(req.owner!)).migrationHashes.length > 0 } }),
);
workspace.post('/migration/preview', async (req: AuthRequest, res) => {
  let incoming: AppData;
  try {
    incoming = validateData(structuredClone(req.body.data));
  } catch (e) {
    throw new ApiError(
      422,
      'MIGRATION_VALIDATION',
      e instanceof Error ? e.message : 'Invalid browser data.',
    );
  }
  const current = await load(req.owner!);
  const hash = migrationFingerprint(req.body.data);
  mergeLegacy(current.data as AppData, incoming);
  res.json({
    ok: true,
    data: {
      hash,
      alreadyMigrated: current.migrationHashes.includes(hash),
      counts: {
        streaks: incoming.activities.length,
        completions: incoming.completions.length,
        tasks: incoming.todos?.length ?? 0,
        ...Object.fromEntries(
          Object.entries(incoming.life!)
            .filter(([, v]) => Array.isArray(v) && typeof v[0] !== 'string')
            .map(([k, v]) => [k, (v as any[]).length]),
        ),
      },
    },
  });
});
workspace.post('/migration', async (req: AuthRequest, res) => {
  const body = z
    .object({ expectedRevision: revision, confirm: z.literal(true), data: z.unknown() })
    .strict()
    .parse(req.body);
  let incoming: AppData;
  try {
    incoming = validateData(structuredClone(body.data));
  } catch (e) {
    throw new ApiError(
      422,
      'MIGRATION_VALIDATION',
      e instanceof Error ? e.message : 'Invalid browser backup.',
    );
  }
  const current = await load(req.owner!);
  const hash = migrationFingerprint(body.data);
  if (current.migrationHashes.includes(hash)) {
    res.json({ ok: true, data: current.data });
    return;
  }
  if (current.migrationHashes.length)
    throw new ApiError(
      409,
      'ALREADY_MIGRATED',
      'This account already imported browser records. Use a reviewed JSON restore for a different backup.',
    );
  res.json({
    ok: true,
    data: await commit(
      req.owner!,
      body.expectedRevision,
      mergeLegacy(current.data as AppData, incoming),
      'before-migration',
      hash,
    ),
  });
});
workspace.post('/reset', async (req: AuthRequest, res) => {
  const body = z
    .object({
      expectedRevision: revision,
      section: z.enum([
        'all',
        'finance',
        'learning',
        'jobs',
        'goals',
        'planner',
        'journal',
        'streaks',
      ]),
      confirm: z.literal(true),
      typed: z.string().optional(),
    })
    .strict()
    .parse(req.body);
  if (body.section === 'all' && body.typed !== 'RESET')
    throw new ApiError(
      422,
      'RESET_CONFIRMATION',
      'Type RESET to confirm clearing every application record.',
    );
  const current = await load(req.owner!);
  res.json({
    ok: true,
    data: await commit(
      req.owner!,
      body.expectedRevision,
      resetData(current.data as AppData, body.section),
      'before-reset-' + body.section,
    ),
  });
});
workspace.post('/planner/clear-completed', async (req: AuthRequest, res) => {
  const body = z
    .object({ expectedRevision: revision, confirm: z.literal(true) })
    .strict()
    .parse(req.body);
  const d = structuredClone((await load(req.owner!)).data) as AppData;
  d.todos = (d.todos ?? []).filter((t) => !t.done);
  res.json({
    ok: true,
    data: await commit(req.owner!, body.expectedRevision, d, 'before-clear-completed'),
  });
});
workspace.get('/backup', async (req: AuthRequest, res) =>
  res.json({ ok: true, data: (await load(req.owner!)).data }),
);
workspace.get('/backup/previous', async (req: AuthRequest, res) => {
  const backup = await Backup.findOne({ userId: req.owner! }).sort({ createdAt: -1 });
  if (!backup)
    throw new ApiError(404, 'NO_BACKUP', 'There is no pre-reset or pre-migration backup yet.');
  res.json({ ok: true, data: backup.data });
});
workspace.get('/reports', async (req: AuthRequest, res) => {
  const { from, to } = req.query;
  if (!validDate(from) || !validDate(to) || from > to || dayDistance(from, to) > 366)
    throw new ApiError(422, 'DATES', 'Choose a valid report date range.');
  res.json({ ok: true, data: lifeReport((await load(req.owner!)).data as AppData, from, to) });
});
workspace.get('/profile', async (req: AuthRequest, res) =>
  res.json({ ok: true, data: ((await load(req.owner!)).data as AppData).preferences }),
);
workspace.patch('/profile', async (req: AuthRequest, res) => {
  const body = z
    .object({ expectedRevision: revision, preferences: z.record(z.string(), z.unknown()) })
    .strict()
    .parse(req.body);
  const d = structuredClone((await load(req.owner!)).data) as AppData;
  const currency = body.preferences.currency;
  if (
    currency &&
    currency !== d.preferences.currency &&
    currency !== 'NGN' &&
    (d.life!.transactions.length || d.life!.accounts.length)
  )
    throw new ApiError(
      422,
      'CURRENCY',
      'A currency change does not convert recorded money. Reset finance with a backup before changing ledger currency.',
    );
  Object.assign(d.preferences, body.preferences);
  res.json({ ok: true, data: await commit(req.owner!, body.expectedRevision, d) });
});
function list(d: AppData, section: string): any[] {
  if (section === 'income' || section === 'expenses')
    return d.life!.transactions.filter(
      (t) => t.kind === (section === 'income' ? 'income' : 'expense'),
    );
  return (
    (['activities', 'completions', 'todos'].includes(section)
      ? (d as any)[section]
      : (d.life as any)[section]) ?? []
  );
}
workspace.get('/:section', async (req: AuthRequest, res) => {
  const section = String(req.params.section);
  if (!sections.includes(section as any))
    throw new ApiError(404, 'ROUTE', 'Unknown record section.');
  const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(req.query.page ?? 1),
    limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .parse(req.query.limit ?? 50);
  const rows = list((await load(req.owner!)).data as AppData, section);
  res.json({
    ok: true,
    data: rows.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: rows.length },
  });
});
for (const method of ['post', 'put', 'delete'] as const)
  workspace[method](
    method === 'post' ? ['/:section/:id', '/:section'] : ['/:section/:id'],
    async (req: AuthRequest, res) => {
      const section = String(req.params.section),
        id = String(req.params.id || crypto.randomUUID());
      if (!sections.includes(section as any) || section === 'completions')
        throw new ApiError(404, 'SECTION', 'Use the workspace API for compound completion edits.');
      const body = z
        .object({
          expectedRevision: revision,
          record: z.record(z.string(), z.unknown()).optional(),
          confirm: z.boolean().optional(),
        })
        .strict()
        .parse(req.body);
      if (method === 'delete' && !body.confirm)
        throw new ApiError(422, 'CONFIRMATION', 'Confirm deletion before continuing.');
      const current = await load(req.owner!);
      const d = structuredClone(current.data) as AppData;
      const key = ['income', 'expenses'].includes(section) ? 'transactions' : section;
      const parent = ['activities', 'todos'].includes(key) ? d : d.life!;
      const rows = ((parent as any)[key] ??= []) as any[];
      const index = rows.findIndex(
        (r) =>
          r.id === id &&
          (section === 'income'
            ? r.kind === 'income'
            : section === 'expenses'
              ? r.kind === 'expense'
              : true),
      );
      if (method === 'post' && index >= 0)
        throw new ApiError(409, 'DUPLICATE', 'That record already exists. Use Edit to change it.');
      if (method !== 'post' && index < 0)
        throw new ApiError(404, 'RECORD', 'This record no longer exists.');
      if (method === 'delete') rows.splice(index, 1);
      else {
        if (!body.record) throw new ApiError(422, 'RECORD', 'Provide the record fields.');
        const record = {
          ...recordDefaults(section, body.record, d.preferences.timeZone),
          id,
          ...(section === 'income'
            ? { kind: 'income' }
            : section === 'expenses'
              ? { kind: 'expense' }
              : {}),
        };
        if (index >= 0) rows[index] = record;
        else rows.push(record);
      }
      res.json({ ok: true, data: await commit(req.owner!, body.expectedRevision, d) });
    },
  );
