import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { TrackerService } from './tracker';
import { Activity } from '../models/tracker';
import { StorageService } from './storage';
const a: Activity = {
  id: 'read',
  name: 'Read',
  description: '',
  icon: '📖',
  color: '#57764b',
  category: 'Learning',
  startDate: '2024-03-01',
  frequency: 'daily',
  weekdays: [1, 2, 3, 4, 5],
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
  vi.useFakeTimers();
  TestBed.configureTestingModule({});
});
afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
});
it('opens a fresh manual check-in at local midnight rather than waiting 24 hours', () => {
  vi.setSystemTime(new Date(2024, 2, 30, 23, 59, 59));
  const t = TestBed.inject(TrackerService);
  t.saveActivity(a);
  t.toggle(a);
  expect(t.today()).toBe('2024-03-30');
  expect(t.completed(a)).toBe(true);
  expect(t.stats(a).current).toBe(1);
  vi.advanceTimersByTime(2000);
  expect(t.today()).toBe('2024-03-31');
  expect(t.completed(a)).toBe(false);
  expect(t.stats(a).current).toBe(1);
  expect(t.data().completions).toHaveLength(1);
  t.toggle(a);
  expect(t.stats(a).current).toBe(2);
  expect(t.data().completions).toHaveLength(2);
  expect(new StorageService().load().completions.map((e) => e.date)).toEqual([
    '2024-03-30',
    '2024-03-31',
  ]);
});
it('lets the user backfill a missed entry and repairs the streak without marking today', () => {
  vi.setSystemTime(new Date(2024, 2, 4, 12));
  const t = TestBed.inject(TrackerService);
  t.saveActivity(a);
  t.record(a, '2024-03-01', 1);
  t.record(a, '2024-03-03', 1);
  expect(t.stats(a).current).toBe(1);
  t.record(a, '2024-03-02', 1, 'I did it but forgot to log it.');
  expect(t.stats(a).current).toBe(3);
  expect(t.completed(a)).toBe(false);
  t.record(a, '2024-03-02', 1);
  expect(t.data().completions).toHaveLength(3);
  expect(t.record(a, '2024-03-05', 1)).toBe(false);
  expect(t.record(a, 'not-a-date', 1)).toBe(false);
});
it('refreshes a sleeping tab on focus and never creates automatic completions', () => {
  vi.setSystemTime(new Date(2024, 2, 31, 12));
  const t = TestBed.inject(TrackerService);
  t.saveActivity(a);
  vi.setSystemTime(new Date(2024, 3, 1, 9));
  window.dispatchEvent(new Event('focus'));
  expect(t.today()).toBe('2024-04-01');
  expect(t.data().completions).toEqual([]);
  expect(t.stats(a).current).toBe(0);
});
it('does not mark a scheduled day missed before it has ended', () => {
  vi.setSystemTime(new Date(2024, 2, 1, 23, 58));
  const t = TestBed.inject(TrackerService);
  t.saveActivity(a);
  t.toggle(a);
  vi.advanceTimersByTime(2 * 60000 + 30);
  expect(t.stats(a).current).toBe(1);
  vi.advanceTimersByTime(new Date(2024, 2, 3, 0, 0, 1).getTime() - Date.now());
  expect(t.stats(a).current).toBe(0);
  expect(t.data().completions).toHaveLength(1);
});
