import { emptyLife } from '../models/life';
import { validateLife } from './life-validation';
import { AppData, emptyData } from '../models/tracker';
import { dateKey, validDate, todayKey } from './dates';
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const text = (v: unknown, max = 500): v is string => typeof v === 'string' && v.length <= max;
export function validateData(raw: unknown): AppData {
  assert(raw && typeof raw === 'object', 'This file does not contain Streakly data.');
  const d = raw as AppData;
  let today: string;
  try {
    today = todayKey(d.preferences?.timeZone);
  } catch {
    throw new Error('Choose a valid IANA time zone.');
  }
  assert(
    d.version === 1 || d.version === 2 || d.version === 3,
    'Unsupported backup version. Choose a Streakly version 1, 2 or 3 backup.',
  );
  assert(
    d.preferences &&
      text(d.preferences.name, 80) &&
      ['light', 'dark'].includes(d.preferences.theme) &&
      typeof d.preferences.onboarded === 'boolean',
    'Invalid preferences.',
  );
  assert(Array.isArray(d.activities) && d.activities.length <= 10000, 'Invalid activities.');
  assert(
    Array.isArray(d.categories) && d.categories.every((c) => text(c, 60) && c.trim()),
    'Invalid categories.',
  );
  assert(
    d.revision === undefined || (Number.isSafeInteger(d.revision) && d.revision >= 0),
    'Invalid data revision.',
  );
  assert(
    d.preferences.compact === undefined || typeof d.preferences.compact === 'boolean',
    'Invalid compact preference.',
  );
  assert(
    d.preferences.remindersEnabled === undefined ||
      typeof d.preferences.remindersEnabled === 'boolean',
    'Invalid reminder preference.',
  );
  assert(
    d.dailyNotes === undefined ||
      (d.dailyNotes &&
        typeof d.dailyNotes === 'object' &&
        !Array.isArray(d.dailyNotes) &&
        Object.entries(d.dailyNotes).every(([date, note]) => validDate(date) && text(note, 1000))),
    'Invalid daily notes.',
  );
  assert(
    d.reminderLog === undefined ||
      (Array.isArray(d.reminderLog) && d.reminderLog.every((x) => text(x, 200))),
    'Invalid reminder history.',
  );
  assert(d.todos === undefined || Array.isArray(d.todos), 'Invalid to-do list.');
  const todoIds = new Set<string>();
  for (const todo of d.todos ?? []) {
    assert(
      todo &&
        text(todo.id, 100) &&
        todo.id &&
        !todoIds.has(todo.id) &&
        text(todo.title, 200) &&
        todo.title.trim() &&
        typeof todo.done === 'boolean' &&
        (todo.dueDate === '' || validDate(todo.dueDate)) &&
        text(todo.createdAt, 50) &&
        Number.isFinite(Date.parse(todo.createdAt)) &&
        text(todo.updatedAt, 50) &&
        Number.isFinite(Date.parse(todo.updatedAt)),
      'Invalid or duplicate task.',
    );
    assert(
      todo.scheduledDate === undefined ||
        todo.scheduledDate === '' ||
        validDate(todo.scheduledDate),
      'Invalid scheduled task date.',
    );
    assert(
      todo.priority === undefined || ['low', 'medium', 'high'].includes(todo.priority),
      'Invalid task priority.',
    );
    assert(
      todo.completedOn === undefined ||
        todo.completedOn === '' ||
        (validDate(todo.completedOn) && todo.completedOn <= today),
      'Invalid task completion date.',
    );
    todoIds.add(todo.id);
  }
  assert(
    d.preferences.currency === undefined ||
      ['NGN', 'USD', 'EUR', 'GBP', 'CAD'].includes(d.preferences.currency),
    'Choose a supported ledger currency.',
  );
  if (d.preferences.timeZone)
    try {
      new Intl.DateTimeFormat('en', { timeZone: d.preferences.timeZone }).format();
    } catch {
      throw new Error('Choose a valid IANA time zone.');
    }
  for (const a of d.activities)
    if (a.automation)
      assert(
        ['learning', 'jobs', 'expenses', 'journal', 'planning'].includes(a.automation.trigger) &&
          ['daily', 'weekly'].includes(a.frequency) &&
          a.quantityTarget === 1 &&
          (a.automation.minimum === undefined ||
            (Number.isFinite(a.automation.minimum) &&
              a.automation.minimum >= 0 &&
              a.automation.minimum <= 1e14)),
        'Automatic rules need daily or weekly Yes/No tracking and a valid trigger.',
      );
  assert(
    d.autoCredits === undefined ||
      (Array.isArray(d.autoCredits) &&
        d.autoCredits.every(
          (c) =>
            c &&
            text(c.activityId, 100) &&
            validDate(c.date) &&
            Number.isFinite(c.baseQuantity) &&
            c.baseQuantity >= 0 &&
            c.baseQuantity <= 1000000 &&
            text(c.baseNote, 1000) &&
            Array.isArray(c.sources) &&
            c.sources.every((id) => text(id, 100)) &&
            ['learning', 'jobs', 'expenses', 'journal', 'planning'].includes(c.trigger),
        )),
    'Invalid automatic completion history.',
  );
  const ids = new Set<string>();
  for (const a of d.activities) {
    assert(a && text(a.id, 100) && a.id && !ids.has(a.id), 'Invalid or duplicate activity ID.');
    ids.add(a.id);
    assert(
      a.progressType === undefined ||
        ['binary', 'quantity', 'duration', 'amount'].includes(a.progressType),
      'Invalid progress type.',
    );
    assert(a.pinned === undefined || typeof a.pinned === 'boolean', 'Invalid pin.');
    assert(
      a.order === undefined || (Number.isFinite(a.order) && a.order >= 0),
      'Invalid activity order.',
    );
    for (const list of [a.restDays, a.freezes])
      assert(
        list === undefined ||
          (Array.isArray(list) &&
            list.every((date) => validDate(date) && date >= a.startDate) &&
            new Set(list).size === list.length),
        'Invalid rest or freeze dates.',
      );
    const monthly = new Map<string, number>();
    for (const date of a.freezes ?? []) {
      assert(date < today, 'Freezes must protect a past date.');
      const key = date.slice(0, 7);
      monthly.set(key, (monthly.get(key) ?? 0) + 1);
      assert(monthly.get(key)! <= 2, 'Only two freezes per month are allowed.');
    }
    assert(
      a.pauses === undefined ||
        (Array.isArray(a.pauses) &&
          a.pauses.every(
            (p) =>
              p &&
              validDate(p.start) &&
              p.start >= a.startDate &&
              (p.end === null || (validDate(p.end) && p.end >= p.start)),
          )),
      'Invalid pause history.',
    );
    assert(
      text(a.name, 100) &&
        a.name.trim() &&
        text(a.description, 1000) &&
        text(a.icon, 20) &&
        /^#[0-9a-f]{6}$/i.test(a.color) &&
        text(a.category, 60),
      'Invalid activity details.',
    );
    assert(
      validDate(a.startDate) &&
        ['daily', 'weekdays', 'weekly', 'monthly', 'interval', 'once'].includes(a.frequency),
      'Invalid schedule.',
    );
    assert(
      Array.isArray(a.weekdays) &&
        a.weekdays.every((n) => Number.isInteger(n) && n >= 0 && n <= 6) &&
        (a.frequency !== 'weekdays' || a.weekdays.length > 0),
      'Choose at least one weekday.',
    );
    assert(
      Number.isInteger(a.interval) &&
        a.interval >= 1 &&
        a.interval <= 365 &&
        Number.isInteger(a.periodTarget) &&
        a.periodTarget >= 1 &&
        a.periodTarget <= (a.frequency === 'weekly' ? 7 : 31),
      'Invalid tracking target.',
    );
    assert(
      Number.isFinite(a.quantityTarget) &&
        a.quantityTarget >= (a.progressType === 'amount' ? 0.01 : 1) &&
        a.quantityTarget <= 1000000 &&
        text(a.unit, 40) &&
        text(a.reminder, 5) &&
        (!a.reminder || /^([01]\d|2[0-3]):[0-5]\d$/.test(a.reminder)) &&
        typeof a.archived === 'boolean' &&
        text(a.updatedAt, 50),
      'Invalid activity preferences.',
    );
  }
  assert(
    Array.isArray(d.completions) && d.completions.length <= 1000000,
    'Invalid completion history.',
  );
  const keys = new Set<string>();
  for (const e of d.completions) {
    assert(e && typeof e === 'object', 'Invalid completion.');
    const a = d.activities.find((a) => a.id === e.activityId);
    const key = e.activityId + ':' + e.date;
    assert(
      e &&
        a &&
        validDate(e.date) &&
        e.date >= a.startDate &&
        e.date <= today &&
        Number.isFinite(e.quantity) &&
        e.quantity > 0 &&
        e.quantity <= 1000000 &&
        text(e.note, 1000) &&
        !keys.has(key),
      'Invalid or duplicate completion.',
    );
    keys.add(key);
  }
  assert(
    Array.isArray(d.milestones) && d.milestones.every((m) => text(m, 150)),
    'Invalid milestones.',
  );
  const result = structuredClone(d);
  if (result.version === 1) {
    result.version = 2;
    result.revision ??= 0;
    result.dailyNotes ??= {};
    result.reminderLog ??= [];
    result.activities = result.activities.map((a) => ({
      ...a,
      progressType: a.progressType ?? (a.quantityTarget > 1 ? 'quantity' : 'binary'),
      restDays: a.restDays ?? [],
      freezes: a.freezes ?? [],
      pauses: a.pauses ?? [],
      pinned: a.pinned ?? false,
      order: a.order ?? 0,
    }));
  }
  if (result.version === 3 && result.life === undefined)
    throw new Error(
      'Version 3 data is missing its life-management records. The original data was kept untouched.',
    );
  if (result.life === undefined) result.life = emptyLife();
  validateLife(result.life, result.activities, today);
  for (const credit of result.life.learningCredits) {
    const activity = result.activities.find((a) => a.id === credit.activityId)!;
    const entries = result.life.learning.filter(
      (e) => e.activityId === credit.activityId && e.date === credit.date,
    );
    const quantity =
      activity.progressType === 'duration'
        ? credit.baseQuantity + entries.reduce((n, e) => n + e.minutes, 0)
        : Math.max(credit.baseQuantity, 1);
    const recorded = result.completions.find(
      (e) => e.activityId === credit.activityId && e.date === credit.date,
    );
    assert(
      (quantity === 0 && !recorded) || (recorded && recorded.quantity === quantity),
      'Learning credit does not match its saved completion history.',
    );
  }
  result.version = 3;
  return result;
}
export function migrateData(raw: unknown): AppData {
  return validateData(raw);
}

/** Explicit, reviewable salvage: never changes storage and never guesses missing history. */
export function recoverRecords(raw: string): {
  data: AppData;
  discardedActivities: number;
  discardedCompletions: number;
  discardedTodos: number;
} {
  const source = JSON.parse(raw) as Partial<AppData>;
  if (!source || typeof source !== 'object' || ![1, 2, 3].includes(source.version as number))
    throw new Error(
      'This data cannot be recovered automatically. Export the original file for safekeeping.',
    );
  const data = emptyData();
  try {
    data.preferences = validateData({
      ...emptyData(),
      preferences: source.preferences,
    }).preferences;
  } catch {
    /* Keep safe default preferences. */
  }
  if (Array.isArray(source.categories))
    data.categories = [
      ...new Set([
        ...data.categories,
        ...source.categories.filter((c) => typeof c === 'string' && c.trim() && c.length <= 60),
      ]),
    ];
  const activities = Array.isArray(source.activities) ? source.activities : [];
  let discardedActivities = 0;
  for (const activity of activities) {
    try {
      validateData({ ...data, activities: [...data.activities, activity] });
      data.activities.push(activity);
      if (!data.categories.includes(activity.category)) data.categories.push(activity.category);
    } catch {
      discardedActivities++;
    }
  }
  const completions = Array.isArray(source.completions) ? source.completions : [];
  let discardedCompletions = 0;
  for (const entry of completions) {
    try {
      validateData({ ...data, completions: [...data.completions, entry] });
      data.completions.push(entry);
    } catch {
      discardedCompletions++;
    }
  }
  if (source.dailyNotes && typeof source.dailyNotes === 'object')
    data.dailyNotes = Object.fromEntries(
      Object.entries(source.dailyNotes).filter(
        ([date, note]) => validDate(date) && text(note, 1000),
      ),
    );
  if (Array.isArray(source.milestones))
    data.milestones = source.milestones.filter((m) => text(m, 150));
  let discardedTodos = 0;
  for (const todo of Array.isArray(source.todos) ? source.todos : []) {
    try {
      validateData({ ...data, todos: [...(data.todos ?? []), todo] });
      data.todos!.push(todo);
    } catch {
      discardedTodos++;
    }
  }
  // New module records are retained only as a validated unit; never guess financial references.
  if (source.life) {
    try {
      validateLife(source.life, data.activities);
      data.life = source.life;
    } catch {
      throw new Error(
        'The life-management records need repair. Export the original backup; automatic recovery will not discard financial records.',
      );
    }
  }
  return { data: validateData(data), discardedActivities, discardedCompletions, discardedTodos };
}
