import { AppData } from '../models/tracker';
import { addDays, datesBetween, weekStart } from './dates';
import { completeOn, dueOn, periods } from './streaks';
export function rangeScore(data: AppData, start: string, end: string): number {
  let total = 0,
    done = 0;
  for (const a of data.activities.filter((a) => !a.archived)) {
    if (a.frequency === 'weekly' || a.frequency === 'monthly' || a.frequency === 'once') {
      const ps = periods(a, data.completions, end).filter((p) => p.end >= start);
      for (const p of ps) {
        if (p.protected) continue;
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

export function weeklyReflection(data: AppData, today: string) {
  const start = weekStart(today),
    previousStart = addDays(start, -7),
    previousEnd = addDays(start, -1);
  const counts = dailyCounts(data, start, today),
    completed = counts.reduce((sum, d) => sum + d.count, 0),
    previous = dailyCounts(data, previousStart, previousEnd).reduce((sum, d) => sum + d.count, 0);
  const active = data.activities.filter(
    (a) =>
      !a.archived &&
      periods(a, data.completions, today).some(
        (p) => p.end >= start && p.target > 0 && !p.protected,
      ),
  );
  const ranked = active
    .map((a) => ({ a, score: rangeScore({ ...data, activities: [a] }, start, today) }))
    .sort((a, b) => b.score - a.score);
  return {
    completed,
    previous,
    change: completed - previous,
    score: rangeScore(data, start, today),
    previousScore: rangeScore(data, previousStart, previousEnd),
    days: counts.filter((d) => d.count > 0).length,
    consistent: ranked.find((x) => x.score > 0)?.a ?? null,
    attention: ranked.filter((x) => x.score < 50).map((x) => x.a),
  };
}
