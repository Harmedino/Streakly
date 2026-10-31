import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { emptyData, Activity } from '../models/tracker';
import { STORAGE_KEY, StorageService, validateData } from './storage';
import { TrackerService } from './tracker';
import { dateKey } from '../core/dates';
const a: Activity = {
  id: 'a',
  name: 'Read',
  description: '',
  icon: '📖',
  color: '#57764b',
  category: 'Learning',
  startDate: '2024-01-01',
  frequency: 'daily',
  weekdays: [1],
  periodTarget: 1,
  interval: 1,
  quantityTarget: 1,
  unit: '',
  reminder: '',
  archived: false,
  updatedAt: '',
};
beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({});
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  TestBed.resetTestingModule();
});
describe('Versioned storage and imports', () => {
  it('persists preferences and complete application history across service reloads', () => {
    const storage = TestBed.inject(StorageService);
    const d = emptyData();
    d.preferences.name = 'Alex';
    d.activities = [a];
    d.completions = [{ activityId: 'a', date: '2024-01-01', quantity: 1, note: 'Chapter one' }];
    expect(storage.save(d)).toBe(true);
    expect(new StorageService().load()).toEqual(d);
  });
  it('preserves corrupt data and blocks automatic overwriting until explicit import', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const s = new StorageService();
    expect(s.load()).toEqual(emptyData());
    expect(s.error()).toBeTruthy();
    expect(s.save(emptyData())).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad');
    expect(s.save(emptyData(), true)).toBe(true);
  });
  it('reports full or unavailable storage', () => {
    const s = TestBed.inject(StorageService);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(s.save(emptyData())).toBe(false);
    expect(s.error()).toContain('not saved');
  });
  it('rejects unsupported versions and malformed structure', () => {
    expect(() => validateData({ ...emptyData(), version: 2 })).toThrow('version');
    expect(() => validateData({})).toThrow();
    expect(() => validateData({ ...emptyData(), activities: [{ ...a, weekdays: [8] }] })).toThrow();
  });
  it('rejects duplicate IDs, orphan completions, impossible dates and invalid targets', () => {
    expect(() => validateData({ ...emptyData(), activities: [a, a] })).toThrow();
    for (const entry of [
      { activityId: 'unknown', date: '2024-01-01', quantity: 1, note: '' },
      { activityId: 'a', date: '2023-02-29', quantity: 1, note: '' },
      null,
    ])
      expect(() =>
        validateData({ ...emptyData(), activities: [a], completions: [entry] }),
      ).toThrow();
    expect(() =>
      validateData({ ...emptyData(), activities: [{ ...a, quantityTarget: 0 }] }),
    ).toThrow();
  });
  it('rejects duplicate history entries', () => {
    const e = { activityId: 'a', date: '2024-01-01', quantity: 1, note: '' };
    expect(() => validateData({ ...emptyData(), activities: [a], completions: [e, e] })).toThrow(
      'duplicate completion',
    );
  });
  it('returns an independent validated copy', () => {
    const raw = emptyData();
    const result = validateData(raw);
    result.preferences.name = 'Changed';
    expect(raw.preferences.name).toBe('');
  });
});
describe('Reactive completion workflow', () => {
  it('prevents duplicate completions and supports undo', () => {
    const t = TestBed.inject(TrackerService);
    t.saveActivity(a);
    t.record(a, dateKey(), 1);
    t.record(a, dateKey(), 1);
    expect(t.data().completions.length).toBe(1);
    expect(t.stats(a).current).toBe(1);
    t.toggle(a);
    expect(t.data().completions).toEqual([]);
    expect(t.stats(a).current).toBe(0);
    expect(new StorageService().load().completions).toEqual([]);
  });
  it('keeps history when archiving and removes it only on deletion', () => {
    const t = TestBed.inject(TrackerService);
    t.saveActivity(a);
    t.record(a, dateKey(), 1, 'Something learned');
    t.archive(a);
    expect(t.active().length).toBe(0);
    expect(t.data().completions.length).toBe(1);
    t.archive(t.data().activities[0]);
    expect(t.active().length).toBe(1);
    t.delete(a);
    expect(t.data().activities.length).toBe(0);
    expect(t.data().completions.length).toBe(0);
  });
  it('prevents a one-time goal from being completed again on a different day', () => {
    const t = TestBed.inject(TrackerService);
    const once = { ...a, frequency: 'once' as const };
    t.saveActivity(once);
    t.record(once, '2024-01-01', 1);
    t.record(once, '2024-01-02', 1);
    expect(t.data().completions).toHaveLength(1);
  });
  it('does not mutate reactive data when storage fails', () => {
    const t = TestBed.inject(TrackerService);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    t.saveActivity(a);
    expect(t.data().activities).toHaveLength(0);
  });
});
