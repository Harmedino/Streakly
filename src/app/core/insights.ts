import { AppData } from '../models/tracker';
import { datesBetween } from './dates';
import { completeOn, dueOn, periods } from './streaks';
export function rangeScore(data: AppData, start: string, end: string): number {
  let total = 0,
    done = 0;
  for (const a of data.activities.filter((a) => !a.archived)) {
    if (a.frequency === 'weekly' || a.frequency === 'monthly' || a.frequency === 'once') {
      const ps = periods(a, data.completions, end).filter((p) => p.end >= start);
      for (const p of ps) {
        total += p.target;
        done += Math.min(p.target, p.completed);
      }
    } else
      for (const d of datesBetween(start, end))
        if (dueOn(a, data.completions, d)) {
          total++;
          if (completeOn(a, data.completions, d)) done++;
        }
  }
  return total ? Math.round((done / total) * 100) : 0;
}
export function dailyCounts(data: AppData, start: string, end: string) {
  return datesBetween(start, end).map((date) => ({
    date,
    count: data.completions.filter(
      (e) =>
        e.date === date &&
        e.quantity >= (data.activities.find((a) => a.id === e.activityId)?.quantityTarget ?? 1),
    ).length,
  }));
}
