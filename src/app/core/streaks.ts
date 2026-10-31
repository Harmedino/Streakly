import { Activity, Completion } from '../models/tracker';
import {
  addDays,
  dateKey,
  datesBetween,
  dayDistance,
  monthEnd,
  monthStart,
  parseDate,
  weekStart,
} from './dates';
export interface Period {
  start: string;
  end: string;
  target: number;
  completed: number;
  success: boolean;
  protected?: boolean;
}
export function isPaused(a: Activity, date: string): boolean {
  return (a.pauses ?? []).some((p) => date >= p.start && (!p.end || date <= p.end));
}
export function isRest(a: Activity, date: string): boolean {
  return (a.restDays ?? []).includes(date);
}
export function isFrozen(a: Activity, date: string): boolean {
  return (a.freezes ?? []).includes(date);
}
export function isScheduled(a: Activity, date: string): boolean {
  if (date < a.startDate || isRest(a, date) || isPaused(a, date)) return false;
  switch (a.frequency) {
    case 'weekdays':
      return a.weekdays.includes(parseDate(date).getDay());
    case 'interval':
      return dayDistance(a.startDate, date) % a.interval === 0;
    case 'once':
      return date === a.startDate;
    default:
      return true;
  }
}
export function completeOn(a: Activity, entries: Completion[], date: string): boolean {
  return (
    (entries.find((e) => e.activityId === a.id && e.date === date)?.quantity ?? 0) >=
    a.quantityTarget
  );
}
export function periods(a: Activity, entries: Completion[], today = dateKey()): Period[] {
  const result: Period[] = [];
  const completedDates = new Set(
    entries
      .filter((e) => e.activityId === a.id && e.quantity >= a.quantityTarget)
      .map((e) => e.date),
  );
  if (a.frequency === 'once') {
    if (a.startDate > today) return result;
    const success = entries.some(
      (e) =>
        e.activityId === a.id &&
        e.date >= a.startDate &&
        e.date <= today &&
        e.quantity >= a.quantityTarget,
    );
    return [{ start: a.startDate, end: today, target: 1, completed: Number(success), success }];
  }
  if (a.startDate > today) return result;
  if (a.frequency === 'weekly' || a.frequency === 'monthly') {
    let start = a.frequency === 'weekly' ? weekStart(a.startDate) : monthStart(a.startDate);
    while (start <= today) {
      const end = a.frequency === 'weekly' ? addDays(start, 6) : monthEnd(start);
      const available = datesBetween(start < a.startDate ? a.startDate : start, end).filter((d) =>
        isScheduled(a, d),
      );
      const target = Math.min(a.periodTarget, available.length);
      const actual = available.filter((d) => d <= today && completedDates.has(d)).length;
      const shields = available.filter((d) => d <= today && isFrozen(a, d)).length;
      result.push({
        start,
        end,
        target,
        completed: actual,
        success: target > 0 && actual >= target,
        protected: target === 0 || (actual < target && actual + shields >= target),
      });
      start = addDays(end, 1);
    }
  } else {
    for (const d of datesBetween(a.startDate, today))
      if (isScheduled(a, d) || (completedDates.has(d) && isScheduled({ ...a, pauses: [] }, d))) {
        const completed = Number(completedDates.has(d));
        result.push({
          start: d,
          end: d,
          target: 1,
          completed,
          success: !!completed,
          protected: isFrozen(a, d) && !completed,
        });
      }
  }
  return result;
}
export function stats(a: Activity, entries: Completion[], today = dateKey()) {
  const ps = periods(a, entries, today);
  let best = 0,
    run = 0;
  for (const p of ps) {
    if (p.protected) continue;
    run = p.success ? run + 1 : 0;
    best = Math.max(best, run);
  }
  let current = 0;
  let i = ps.length - 1;
  if (i >= 0 && !ps[i].success && ps[i].end >= today) i--;
  for (; i >= 0; i--) {
    if (ps[i].protected) continue;
    if (!ps[i].success) break;
    current++;
  }
  const eligible = ps.filter((p) => !p.protected && (p.end < today || p.success));
  const successful = ps.filter((p) => p.success).length;
  const completions = entries.filter(
    (e) => e.activityId === a.id && e.date <= today && e.quantity >= a.quantityTarget,
  );
  return {
    current: a.frequency === 'once' ? 0 : current,
    best: a.frequency === 'once' ? 0 : best,
    totalPeriods: successful,
    total: completions.length,
    rate: eligible.length ? Math.round((successful / eligible.length) * 100) : 0,
    last:
      completions
        .map((e) => e.date)
        .sort()
        .at(-1) ?? null,
    periods: ps,
  };
}
export function dueOn(a: Activity, entries: Completion[], date: string): boolean {
  if (a.archived || date < a.startDate || isPaused(a, date) || isRest(a, date) || isFrozen(a, date))
    return false;
  if (a.frequency === 'once')
    return !entries.some(
      (e) => e.activityId === a.id && e.date < date && e.quantity >= a.quantityTarget,
    );
  if (a.frequency === 'weekly' || a.frequency === 'monthly') {
    const p = periods(a, entries, date).at(-1);
    return completeOn(a, entries, date) || !p?.success;
  }
  return isScheduled(a, date);
}
export function scheduleLabel(a: Activity): string {
  if (a.frequency === 'weekdays')
    return a.weekdays.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
  if (a.frequency === 'weekly') return `${a.periodTarget} times / week`;
  if (a.frequency === 'monthly') return `${a.periodTarget} times / month`;
  if (a.frequency === 'interval') return `Every ${a.interval} days`;
  return a.frequency === 'once' ? 'One-time goal' : 'Every day';
}

/** A flexible weekly/monthly goal can only be missed when its whole period has ended. */
export function missedOn(
  a: Activity,
  entries: Completion[],
  date: string,
  today = dateKey(),
): boolean {
  if (
    date >= today ||
    !isScheduled(a, date) ||
    isFrozen(a, date) ||
    completeOn(a, entries, date) ||
    a.frequency === 'once'
  )
    return false;
  if (a.frequency === 'weekly' || a.frequency === 'monthly') {
    const period = periods(a, entries, today).find((p) => p.start <= date && p.end >= date);
    return !!period && period.end < today && !period.success && !period.protected;
  }
  return isScheduled(a, date);
}

export type CalendarStatus =
  | 'completed'
  | 'partial'
  | 'missed'
  | 'rest'
  | 'frozen'
  | 'paused'
  | 'upcoming'
  | 'unscheduled'
  | 'pending';
export const STATUS_LABELS: Record<CalendarStatus, string> = {
  completed: 'Completed',
  partial: 'Partially completed',
  missed: 'Missed',
  rest: 'Planned rest',
  frozen: 'Streak freeze',
  paused: 'Paused',
  upcoming: 'Upcoming',
  unscheduled: 'Unscheduled',
  pending: 'Still open',
};
export function calendarStatus(
  a: Activity,
  entries: Completion[],
  date: string,
  today = dateKey(),
): CalendarStatus {
  if (date < a.startDate) return 'unscheduled';
  if (completeOn(a, entries, date)) return 'completed';
  if (isPaused(a, date)) return 'paused';
  if (isRest(a, date)) return 'rest';
  if (isFrozen(a, date)) return 'frozen';
  if (entries.some((e) => e.activityId === a.id && e.date === date && e.quantity > 0))
    return 'partial';
  if (!dueOn({ ...a, archived: false }, entries, date)) return 'unscheduled';
  if (date > today) return 'upcoming';
  if (missedOn(a, entries, date, today)) return 'missed';
  return 'pending';
}
export function canFreeze(
  a: Activity,
  entries: Completion[],
  date: string,
  today = dateKey(),
): boolean {
  return (
    !a.archived &&
    date < today &&
    !isFrozen(a, date) &&
    !isRest(a, date) &&
    !isPaused(a, date) &&
    missedOn(a, entries, date, today) &&
    (a.freezes ?? []).filter((d) => d.slice(0, 7) === date.slice(0, 7)).length < 2
  );
}
export function orderedActivities(activities: Activity[]): Activity[] {
  return [...activities].sort(
    (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (a.order ?? 0) - (b.order ?? 0),
  );
}
