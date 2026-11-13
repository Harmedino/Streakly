import { emptyLife } from '../models/life';
import { AppData } from '../models/tracker';
import {
  addDays,
  datesBetween,
  monthEnd,
  monthShift,
  monthStart,
  todayKey,
  weekStart,
} from './dates';
import { financeTotals, savingsProgress } from './finance';
import { rangeScore } from './insights';
import { missedOn, stats } from './streaks';
export function lifeReport(data: AppData, start: string, end: string) {
  const life = data.life ?? emptyLife();
  const during = (date: string) => date >= start && date <= end;
  return {
    ...financeTotals(life, start, end),
    learningPeak:
      [...new Set(life.learning.filter((e) => during(e.date)).map((e) => e.date))]
        .map((date) => ({ date, count: life.learning.filter((e) => e.date === date).length }))
        .sort((a, b) => b.count - a.count)[0] ?? null,
    completedDays: new Set(
      data.completions
        .filter(
          (c) =>
            during(c.date) &&
            c.quantity >=
              (data.activities.find((a) => a.id === c.activityId)?.quantityTarget ?? Infinity),
        )
        .map((c) => c.date),
    ).size,
    targetProgress: (life.targets ?? [])
      .filter((t) => t.month === end.slice(0, 7))
      .map((t) => ({
        id: t.id,
        kind: t.kind,
        source: t.source,
        amount: t.amount,
        actual:
          t.kind === 'savings'
            ? life.contributions
                .filter((c) => c.date.startsWith(t.month) && c.date <= end)
                .reduce((n, c) => n + c.amount, 0)
            : life.transactions
                .filter(
                  (r) =>
                    r.date.startsWith(t.month) &&
                    r.date <= end &&
                    r.kind === t.kind &&
                    (!t.source || r.source === t.source),
                )
                .reduce((n, r) => n + r.amount, 0),
      })),
    savingsProgress: life.savingsGoals.map((g) => ({
      id: g.id,
      name: g.name,
      percent: Math.round((savingsProgress(life, g.id, end) / g.target) * 100),
    })),
    upcomingGoals: life.goals
      .filter(
        (g) =>
          g.status === 'active' &&
          g.deadline &&
          g.deadline >= end &&
          g.deadline <= addDays(end, 30),
      )
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 3)
      .map((g) => ({ title: g.title, deadline: g.deadline })),
    notesCreated: life.learning.filter((e) => during(e.date)).length,
    topics: [
      ...new Set(
        life.learning
          .filter((e) => during(e.date))
          .map((e) => e.topic)
          .filter(Boolean),
      ),
    ],
    learningDays: new Set(life.learning.filter((e) => during(e.date)).map((e) => e.date)).size,
    automaticCompletions: (data.autoCredits ?? []).filter((c) => during(c.date)).length,
    activeStreaks: data.activities.filter(
      (a) => !a.archived && stats(a, data.completions, end).current > 0,
    ).length,
    longestStreak: Math.max(0, ...data.activities.map((a) => stats(a, data.completions, end).best)),
    missedDays: datesBetween(start, end).reduce(
      (n, date) =>
        n +
        data.activities.filter(
          (a) =>
            !a.archived && missedOn(a, data.completions, date, todayKey(data.preferences.timeZone)),
        ).length,
      0,
    ),
    goalsInProgress: life.goals.filter((g) => g.status === 'active').length,
    overdueGoals: life.goals.filter((g) => g.status === 'active' && g.deadline && g.deadline < end)
      .length,

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
        .filter(
          (e) =>
            during(e.date) &&
            e.from < 100 &&
            e.to === 100 &&
            life.goalEvents.filter((event) => event.goalId === e.goalId && event.date <= end).at(-1)
              ?.to === 100,
        )
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
