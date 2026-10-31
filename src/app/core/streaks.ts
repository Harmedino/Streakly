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
}
export function isScheduled(a: Activity, date: string): boolean {
  if (date < a.startDate) return false;
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
      const completed = datesBetween(
        start < a.startDate ? a.startDate : start,
        end < today ? end : today,
      ).filter((d) => completedDates.has(d)).length;
      result.push({
        start,
        end,
        target: a.periodTarget,
        completed,
        success: completed >= a.periodTarget,
      });
      start = addDays(end, 1);
    }
  } else {
    for (const d of datesBetween(a.startDate, today))
      if (isScheduled(a, d)) {
        const completed = Number(completedDates.has(d));
        result.push({ start: d, end: d, target: 1, completed, success: !!completed });
      }
  }
  return result;
}
export function stats(a: Activity, entries: Completion[], today = dateKey()) {
  const ps = periods(a, entries, today);
  let best = 0,
    run = 0;
  for (const p of ps) {
    run = p.success ? run + 1 : 0;
    best = Math.max(best, run);
  }
  let current = 0;
  let i = ps.length - 1;
  if (i >= 0 && !ps[i].success && ps[i].end >= today) i--;
  for (; i >= 0 && ps[i].success; i--) current++;
  const eligible = ps.filter((p) => p.end < today || p.success);
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
  if (a.archived || date < a.startDate) return false;
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
  if (date >= today || date < a.startDate || completeOn(a, entries, date) || a.frequency === 'once')
    return false;
  if (a.frequency === 'weekly' || a.frequency === 'monthly') {
    const period = periods(a, entries, today).find((p) => p.start <= date && p.end >= date);
    return !!period && period.end < today && !period.success;
  }
  return isScheduled(a, date);
}
