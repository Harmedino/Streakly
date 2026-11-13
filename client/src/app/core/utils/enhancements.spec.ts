import { describe, expect, it } from 'vitest';
import { Activity, Completion, emptyData } from '../models/tracker';
import { weeklyReflection } from './insights';
import { calendarStatus, canFreeze, dueOn, stats } from './streaks';
const a: Activity = {
  id: 'a',
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
};
const entries = (...dates: string[]): Completion[] =>
  dates.map((date) => ({ activityId: 'a', date, quantity: 1, note: '' }));
describe('Breaks and streak protection', () => {
  it('skips planned rest without adding a success or breaking the streak', () => {
    const x = { ...a, restDays: ['2024-02-27'] };
    expect(stats(x, entries('2024-02-26', '2024-02-28'), '2024-02-28')).toMatchObject({
      current: 2,
      best: 2,
      totalPeriods: 2,
      rate: 100,
    });
    expect(dueOn(x, [], '2024-02-27')).toBe(false);
  });
  it('preserves a daily streak with a freeze and never increases it', () => {
    const x = { ...a, freezes: ['2024-02-27'] };
    expect(stats(x, entries('2024-02-26', '2024-02-28'), '2024-02-28')).toMatchObject({
      current: 2,
      best: 2,
      totalPeriods: 2,
    });
    expect(calendarStatus(x, [], '2024-02-27', '2024-02-28')).toBe('frozen');
  });
  it('enforces two manual freezes per calendar month, no duplicates or future freezes', () => {
    const x = { ...a, startDate: '2024-01-01', freezes: ['2024-02-01', '2024-02-02'] };
    expect(canFreeze(x, [], '2024-02-03', '2024-03-05')).toBe(false);
    expect(canFreeze(x, [], '2024-03-01', '2024-03-05')).toBe(true);
    expect(canFreeze(x, [], '2024-03-06', '2024-03-05')).toBe(false);
    expect(canFreeze(x, [], '2024-02-01', '2024-03-05')).toBe(false);
  });
  it('cannot freeze a completed, unscheduled, resting or paused day', () => {
    expect(canFreeze(a, entries('2024-02-26'), '2024-02-26', '2024-03-01')).toBe(false);
    expect(canFreeze({ ...a, frequency: 'weekdays' }, [], '2024-02-27', '2024-03-01')).toBe(false);
    expect(canFreeze({ ...a, restDays: ['2024-02-26'] }, [], '2024-02-26', '2024-03-01')).toBe(
      false,
    );
    expect(
      canFreeze(
        { ...a, pauses: [{ start: '2024-02-26', end: null }] },
        [],
        '2024-02-26',
        '2024-03-01',
      ),
    ).toBe(false);
  });
  it('preserves streaks across a paused range and resumes tracking after it', () => {
    const x = { ...a, pauses: [{ start: '2024-02-27', end: '2024-02-29' }] };
    expect(stats(x, entries('2024-02-26', '2024-03-01'), '2024-03-01').current).toBe(2);
    expect(calendarStatus(x, [], '2024-02-28', '2024-03-01')).toBe('paused');
    expect(stats(x, entries('2024-02-26'), '2024-03-03').current).toBe(0);
  });
  it('keeps selected weekdays and interval anchors intact around rest', () => {
    const x = { ...a, frequency: 'interval' as const, restDays: ['2024-02-28'] };
    expect(stats(x, entries('2024-02-26', '2024-03-01'), '2024-03-01').current).toBe(2);
  });
  it('protects a weekly period only if recorded days plus freezes reach its target', () => {
    const x = { ...a, frequency: 'weekly' as const, freezes: ['2024-03-01'] };
    expect(stats(x, entries('2024-02-26'), '2024-03-04')).toMatchObject({
      current: 0,
      best: 0,
      totalPeriods: 0,
    });
    expect(
      stats(
        { ...x, startDate: '2024-02-19' },
        entries('2024-02-19', '2024-02-20', '2024-02-26'),
        '2024-03-04',
      ).current,
    ).toBe(1);
  });
  it('excludes fully paused weeks and months without treating them as successful', () => {
    const x = {
      ...a,
      frequency: 'monthly' as const,
      pauses: [{ start: '2024-02-26', end: '2024-03-31' }],
    };
    expect(stats(x, [], '2024-04-01')).toMatchObject({
      current: 0,
      best: 0,
      totalPeriods: 0,
      rate: 0,
    });
  });
});
describe('Progress and deterministic reflection', () => {
  it('shows partial and completed duration and amount targets accurately', () => {
    for (const type of ['duration', 'amount'] as const) {
      const x = { ...a, progressType: type, quantityTarget: 90 };
      expect(
        calendarStatus(
          x,
          [{ activityId: 'a', date: '2024-02-26', quantity: 45, note: '' }],
          '2024-02-26',
          '2024-02-26',
        ),
      ).toBe('partial');
      expect(
        stats(x, [{ activityId: 'a', date: '2024-02-26', quantity: 90, note: '' }], '2024-02-26')
          .total,
      ).toBe(1);
    }
  });
  it('reflects real completions, active days, attention and week comparison', () => {
    const d = emptyData();
    d.activities = [a];
    d.completions = entries('2024-02-26', '2024-02-27');
    expect(weeklyReflection(d, '2024-02-28')).toMatchObject({
      completed: 2,
      previous: 0,
      change: 2,
      score: 67,
      days: 2,
    });
    expect(weeklyReflection(d, '2024-02-28').consistent?.id).toBe('a');
  });
  it('does not invent data in an empty reflection', () => {
    expect(weeklyReflection(emptyData(), '2024-03-01')).toMatchObject({
      completed: 0,
      score: 0,
      days: 0,
      consistent: null,
    });
  });
});
