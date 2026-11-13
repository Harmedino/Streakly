import { describe, expect, it } from 'vitest';
import { Activity, Completion } from '../models/tracker';
import { addDays, dateKey, dayDistance, monthEnd, validDate, weekStart } from './dates';
import { completeOn, dueOn, missedOn, periods, stats } from './streaks';
const activity = (extra: Partial<Activity> = {}): Activity => ({
  id: 'test',
  name: 'Read',
  description: '',
  icon: '📖',
  color: '#57764b',
  category: 'Learning',
  startDate: '2024-02-26',
  frequency: 'daily',
  weekdays: [1, 3, 5],
  periodTarget: 2,
  interval: 2,
  quantityTarget: 1,
  unit: '',
  reminder: '',
  archived: false,
  updatedAt: '',
  ...extra,
});
const entries = (...dates: string[]): Completion[] =>
  dates.map((date) => ({ activityId: 'test', date, quantity: 1, note: '' }));
describe('Local calendar arithmetic', () => {
  it('walks through leap day and month boundaries', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(monthEnd('2024-02-01')).toBe('2024-02-29');
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01');
  });
  it('rejects impossible dates', () => {
    expect(validDate('2023-02-29')).toBe(false);
    expect(validDate('2024-02-29')).toBe(true);
    expect(validDate('2024-13-01')).toBe(false);
  });
  it('counts calendar dates across DST independently of elapsed hours', () => {
    expect(dayDistance('2024-03-30', '2024-04-01')).toBe(2);
    expect(addDays('2024-03-31', 1)).toBe('2024-04-01');
    expect(dayDistance('2024-10-26', '2024-10-28')).toBe(2);
    expect(weekStart('2025-01-01')).toBe('2024-12-30');
  });
  it('formats local date parts rather than UTC', () => {
    expect(dateKey(new Date(2024, 1, 29, 23, 59))).toBe('2024-02-29');
  });
});
describe('Scheduled streaks', () => {
  it('counts consecutive daily completions and leaves today open', () => {
    const a = activity();
    const e = entries('2024-02-26', '2024-02-27', '2024-02-28');
    expect(stats(a, e, '2024-02-29')).toMatchObject({ current: 3, best: 3, total: 3, rate: 100 });
  });
  it('breaks after a missed scheduled day while preserving the best', () => {
    expect(
      stats(activity(), entries('2024-02-26', '2024-02-27', '2024-02-29'), '2024-03-01'),
    ).toMatchObject({ current: 1, best: 2, rate: 75 });
  });
  it('does not multiply duplicate records into extra streak days', () => {
    expect(stats(activity(), entries('2024-02-26', '2024-02-26'), '2024-02-26').current).toBe(1);
  });
  it('skips unscheduled weekdays without breaking the run', () => {
    const a = activity({ frequency: 'weekdays' });
    expect(stats(a, entries('2024-02-26', '2024-02-28', '2024-03-01'), '2024-03-03').current).toBe(
      3,
    );
    expect(stats(a, entries('2024-02-26', '2024-03-01'), '2024-03-03').current).toBe(1);
  });
  it('uses the start date as the custom interval anchor', () => {
    const a = activity({ frequency: 'interval' });
    expect(stats(a, entries('2024-02-26', '2024-02-28', '2024-03-01'), '2024-03-02').current).toBe(
      3,
    );
    expect(dueOn(a, [], '2024-02-27')).toBe(false);
  });
  it('requires quantity target before a day succeeds', () => {
    const a = activity({ quantityTarget: 20 });
    expect(
      completeOn(
        a,
        [{ activityId: a.id, date: '2024-02-26', quantity: 19, note: '' }],
        '2024-02-26',
      ),
    ).toBe(false);
  });
  it('does not count a future start', () =>
    expect(stats(activity({ startDate: '2025-01-01' }), [], '2024-12-31').current).toBe(0));
  it('one-time goals have no recurring streak and can be completed after start', () => {
    const a = activity({ frequency: 'once' });
    expect(stats(a, entries('2024-03-03'), '2024-03-04')).toMatchObject({
      current: 0,
      best: 0,
      totalPeriods: 1,
      total: 1,
    });
    expect(dueOn(a, entries('2024-03-03'), '2024-03-04')).toBe(false);
  });
});
describe('Weekly and monthly goals', () => {
  it('counts successful weeks and protects an unfinished current week', () => {
    const a = activity({ frequency: 'weekly' });
    expect(
      stats(a, entries('2024-02-26', '2024-02-29', '2024-03-04', '2024-03-06'), '2024-03-12'),
    ).toMatchObject({ current: 2, best: 2, totalPeriods: 2 });
  });
  it('breaks at the end of an unsuccessful week', () => {
    expect(
      stats(activity({ frequency: 'weekly' }), entries('2024-02-26', '2024-02-29'), '2024-03-11')
        .current,
    ).toBe(0);
  });
  it('counts a week once even when completed on extra days', () => {
    expect(
      stats(
        activity({ frequency: 'weekly' }),
        entries('2024-02-26', '2024-02-27', '2024-02-28'),
        '2024-03-01',
      ).current,
    ).toBe(1);
  });
  it('handles leap February and year changes for monthly goals', () => {
    const a = activity({ frequency: 'monthly', startDate: '2023-12-01' });
    const e = entries(
      '2023-12-04',
      '2023-12-05',
      '2024-01-10',
      '2024-01-20',
      '2024-02-28',
      '2024-02-29',
    );
    expect(stats(a, e, '2024-03-15')).toMatchObject({ current: 3, best: 3 });
    expect(stats(a, e, '2024-04-01').current).toBe(0);
  });
  it('does not count days before a mid-period start', () => {
    const a = activity({ frequency: 'weekly', startDate: '2024-02-28' });
    expect(periods(a, entries('2024-02-26', '2024-02-28'), '2024-03-01')[0].completed).toBe(1);
  });
});

describe('Missed calendar status for flexible targets', () => {
  it('leaves the current week open and does not mark successful weeks as missed', () => {
    const a = activity({ frequency: 'weekly' });
    expect(missedOn(a, [], '2024-02-26', '2024-02-29')).toBe(false);
    expect(missedOn(a, entries('2024-02-28', '2024-02-29'), '2024-02-26', '2024-03-04')).toBe(
      false,
    );
    expect(missedOn(a, [], '2024-02-26', '2024-03-04')).toBe(true);
  });
  it('leaves current monthly and one-time goals open', () => {
    expect(missedOn(activity({ frequency: 'monthly' }), [], '2024-02-26', '2024-02-29')).toBe(
      false,
    );
    expect(missedOn(activity({ frequency: 'once' }), [], '2024-02-26', '2024-03-04')).toBe(false);
  });
});
