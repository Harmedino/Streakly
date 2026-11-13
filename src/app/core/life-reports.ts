import { AppData } from '../models/tracker';
import { emptyLife } from '../models/life';
import { addDays, monthEnd, monthShift, monthStart, weekStart } from './dates';
import { financeTotals } from './finance';
import { rangeScore } from './insights';
export function lifeReport(data: AppData, start: string, end: string) {
  const life = data.life ?? emptyLife();
  const during = (date: string) => date >= start && date <= end;
  return {
    ...financeTotals(life, start, end),
    consistency: rangeScore(data, start, end),
    learningMinutes: life.learning
      .filter((e) => during(e.date))
      .reduce((sum, e) => sum + e.minutes, 0),
    applications: life.jobs.filter((j) => during(j.date)).length,
    tasksCompleted: (data.todos ?? []).filter(
      (t) => t.done && t.completedOn && during(t.completedOn),
    ).length,
    goalsProgressed: new Set(
      life.goalEvents.filter((e) => during(e.date) && e.to > e.from).map((e) => e.goalId),
    ).size,
    goalsCompleted: new Set(
      life.goalEvents
        .filter((e) => during(e.date) && e.from < 100 && e.to === 100)
        .map((e) => e.goalId),
    ).size,
  };
}
export function reportRange(kind: 'week' | 'month', date: string) {
  const start = kind === 'week' ? weekStart(date) : monthStart(date),
    end = kind === 'week' ? addDays(start, 6) : monthEnd(date);
  return { start, end };
}
export function previousRange(kind: 'week' | 'month', date: string) {
  return reportRange(kind, kind === 'week' ? addDays(date, -7) : monthShift(monthStart(date), -1));
}
