import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { emptyData, Activity } from '../models/tracker';
import { STORAGE_KEY, StorageService, validateData, recoverRecords } from './storage';
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
    expect(() => validateData({ ...emptyData(), version: 99 })).toThrow('version');
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

describe('Personal categories', () => {
  it('trims names and prevents duplicate categories regardless of case', () => {
    const t = TestBed.inject(TrackerService);
    expect(t.addCategory('  Mindfulness  ')).toBe(true);
    expect(t.addCategory('mindfulness')).toBe(false);
    expect(t.addCategory('  ')).toBe(false);
    expect(t.data().categories.filter((c) => c.toLowerCase() === 'mindfulness')).toEqual([
      'Mindfulness',
    ]);
    expect(new StorageService().load().categories).toContain('Mindfulness');
  });
  it('renames assigned categories atomically without losing completion history', () => {
    const t = TestBed.inject(TrackerService);
    t.saveActivity(a);
    t.record(a, dateKey(), 1, 'Keep this note');
    expect(t.renameCategory('Learning', 'My studies')).toBe(true);
    expect(t.data().activities[0].category).toBe('My studies');
    expect(t.data().categories).not.toContain('Learning');
    expect(new StorageService().load().activities[0].category).toBe('My studies');
    expect(t.data().completions[0].note).toBe('Keep this note');
    expect(t.renameCategory('My studies', 'Health')).toBe(false);
  });
  it('keeps the original category when persistence fails', () => {
    const t = TestBed.inject(TrackerService);
    t.saveActivity(a);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    expect(t.renameCategory('Learning', 'My studies')).toBe(false);
    expect(t.data().activities[0].category).toBe('Learning');
  });
});

describe('Migration and concurrent tabs', () => {
  it('migrates version 1 without losing notes or completions', () => {
    const old = {
      ...emptyData(),
      version: 1,
      activities: [a],
      completions: [{ activityId: a.id, date: '2024-01-01', quantity: 1, note: 'Original' }],
    };
    const result = validateData(old);
    expect(result.version).toBe(2);
    expect(result.activities[0].progressType).toBe('binary');
    expect(result.completions[0].note).toBe('Original');
    expect(validateData(result)).toEqual(result);
  });
  it('rejects a stale save rather than overwriting a newer tab', () => {
    const one = new StorageService(),
      two = new StorageService();
    one.load();
    two.load();
    const d = emptyData();
    d.preferences.name = 'Newer';
    expect(one.save(d)).toBe(true);
    expect(two.save(emptyData())).toBe(false);
    expect(two.error()).toContain('another tab');
    expect(new StorageService().load().preferences.name).toBe('Newer');
    one.ngOnDestroy();
    two.ngOnDestroy();
  });
  it('synchronizes external storage updates before another change is allowed', () => {
    const t = TestBed.inject(TrackerService);
    const incoming = emptyData();
    incoming.preferences.name = 'Other tab';
    incoming.revision = 4;
    const raw = JSON.stringify(incoming);
    localStorage.setItem(STORAGE_KEY, raw);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: raw }));
    expect(t.update((d) => (d.preferences.name = 'Stale edit'))).toBe(false);
    expect(t.data().preferences.name).toBe('Other tab');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).revision).toBe(4);
  });
  it('rejects over-quota, future and duplicate imported freeze dates', () => {
    for (const freezes of [
      ['2024-01-01', '2024-01-02', '2024-01-03'],
      ['2200-01-01'],
      ['2024-01-01', '2024-01-01'],
    ])
      expect(() => validateData({ ...emptyData(), activities: [{ ...a, freezes }] })).toThrow();
  });
  it('exports and restores all new preferences and history intact', () => {
    const d = emptyData();
    d.activities = [
      {
        ...a,
        progressType: 'duration',
        quantityTarget: 60,
        restDays: ['2024-01-03'],
        freezes: ['2024-01-02'],
        pauses: [{ start: '2024-01-04', end: '2024-01-05' }],
        pinned: true,
        order: 2,
      },
    ];
    d.dailyNotes = { '2024-01-01': 'A little reflection' };
    d.preferences.compact = true;
    d.preferences.remindersEnabled = true;
    expect(validateData(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
});

describe('Reviewable record recovery', () => {
  it('keeps valid history and reports damaged records without writing storage', () => {
    const raw = JSON.stringify({
      ...emptyData(),
      activities: [a, { id: 'broken' }],
      completions: [
        { activityId: 'a', date: '2024-01-01', quantity: 1, note: 'Keep me' },
        { activityId: 'missing', date: '2024-01-01', quantity: 1, note: '' },
      ],
    });
    localStorage.setItem(STORAGE_KEY, raw);
    const r = recoverRecords(raw);
    expect(r.discardedActivities).toBe(1);
    expect(r.discardedCompletions).toBe(1);
    expect(r.data.completions[0].note).toBe('Keep me');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });
});
