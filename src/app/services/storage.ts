import { Injectable, signal } from '@angular/core';
import { AppData, emptyData } from '../models/tracker';
import { dateKey, validDate } from '../core/dates';
export const STORAGE_KEY = 'streakly.data.v1';
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const text = (v: unknown, max = 500): v is string => typeof v === 'string' && v.length <= max;
export function validateData(raw: unknown): AppData {
  assert(raw && typeof raw === 'object', 'This file does not contain Streakly data.');
  const d = raw as AppData;
  assert(d.version === 1, 'Unsupported backup version. Export a version 1 Streakly backup.');
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
  const ids = new Set<string>();
  for (const a of d.activities) {
    assert(a && text(a.id, 100) && a.id && !ids.has(a.id), 'Invalid or duplicate activity ID.');
    ids.add(a.id);
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
        a.quantityTarget >= 1 &&
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
        e.date <= dateKey() &&
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
  return structuredClone(d);
}
export function migrateData(raw: unknown): AppData {
  return validateData(raw);
}
@Injectable({ providedIn: 'root' })
export class StorageService {
  readonly error = signal('');
  readonly recovery = signal<string | null>(null);
  private readFailed = false;
  load(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.recovery.set(raw);
      const data = raw ? migrateData(JSON.parse(raw)) : emptyData();
      this.recovery.set(null);
      return data;
    } catch {
      this.readFailed = true;
      this.error.set(
        'Your saved data could not be read. It has been kept untouched. Export or import a backup in Settings before saving new changes.',
      );
      return emptyData();
    }
  }
  save(data: AppData, replaceCorrupt = false): boolean {
    if (this.readFailed && !replaceCorrupt) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.readFailed = false;
      this.recovery.set(null);
      this.error.set('');
      return true;
    } catch {
      this.error.set(
        'Browser storage is unavailable or full. This change was not saved. Export a backup or free up browser storage.',
      );
      return false;
    }
  }
}
