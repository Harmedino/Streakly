import { AppData, Todo } from '../models/tracker';
import { addDays, datesBetween, monthStart, todayKey } from './dates';
import { financeTotals, groupMoney } from './finance';
import { lifeReport, previousRange, reportRange } from './life-reports';
import { completeOn, dueOn, missedOn, periods } from './streaks';
import { goalPercent } from './workflows';
export interface ReportItem {
  id: string;
  title: string;
  kind: string;
  date: string;
  path: string;
  status: 'Completed' | 'Pending' | 'Missed' | 'Overdue' | 'Upcoming';
  detail?: string;
  taskId?: string;
  goalId?: string;
  jobId?: string;
  followUpId?: string;
}
export function taskDay(task: Todo, asOf?: string) {
  if (asOf) {
    const future = task.scheduleHistory?.find((e) => e.date > asOf);
    if (future) return future.from || future.fromDue;
  }
  return task.scheduledDate || task.dueDate;
}
function goalProgressAt(data: AppData, id: string, date: string) {
  const events = data.life!.goalEvents.filter((e) => e.goalId === id && e.date <= date);
  if (events.length) return events.at(-1)!.to;
  const goal = data.life!.goals.find((g) => g.id === id)!;
  return goal.updatedOn <= date ? goalPercent(goal) : 0;
}
export function dailyReport(
  data: AppData,
  date: string,
  today = todayKey(data.preferences.timeZone),
) {
  const life = data.life!,
    completed: ReportItem[] = [],
    attention: ReportItem[] = [],
    tomorrow: ReportItem[] = [];
  const dayEnded = date < today,
    next = addDays(date, 1);
  const pending = date > today ? 'Upcoming' : dayEnded ? 'Missed' : 'Pending';
  const taskDone = (t: Todo, when: string) => !!t.done && !!t.completedOn && t.completedOn <= when;
  for (const task of data.todos ?? []) {
    const day = taskDay(task, date);
    if (task.done && task.completedOn === date)
      completed.push({
        id: 'task:' + task.id,
        title: task.title,
        kind: 'Task',
        date,
        path: '/planner',
        status: 'Completed',
        taskId: task.id,
      });
    if (!taskDone(task, date) && day && day <= date)
      attention.push({
        id: 'task:' + task.id,
        title: task.title,
        kind: 'Task',
        date: day,
        path: '/planner',
        status: day < date ? 'Overdue' : pending,
        taskId: task.id,
        detail: day < date ? 'Scheduled ' + day : undefined,
      });
    if (!taskDone(task, next) && day === next)
      tomorrow.push({
        id: 'task:' + task.id,
        title: task.title,
        kind: 'Task',
        date: next,
        path: '/planner',
        status: 'Upcoming',
        taskId: task.id,
      });
  }
  for (const habit of data.activities) {
    if (completeOn(habit, data.completions, date))
      completed.push({
        id: 'habit:' + habit.id,
        title: habit.name,
        kind: 'Streak',
        date,
        path: '/activities/' + habit.id,
        status: 'Completed',
      });
    if (dueOn(habit, data.completions, date) && !completeOn(habit, data.completions, date)) {
      const flexible = habit.frequency === 'weekly' || habit.frequency === 'monthly';
      const period = flexible ? periods(habit, data.completions, date).at(-1) : undefined;
      // Flexible goals are missed only once their whole tracking period has ended.
      const missed = flexible
        ? !!period && period.end <= date && period.end < today && !period.success
        : dayEnded;
      if (!flexible || missed || date >= today)
        attention.push({
          id: 'habit:' + habit.id,
          title: habit.name,
          kind: 'Streak',
          date,
          path: '/activities/' + habit.id,
          status: missed ? 'Missed' : date > today ? 'Upcoming' : 'Pending',
          detail: flexible ? 'Flexible ' + habit.frequency + ' target' : undefined,
        });
    }
    if (dueOn(habit, data.completions, next))
      tomorrow.push({
        id: 'habit:' + habit.id,
        title: habit.name,
        kind: 'Streak',
        date: next,
        path: '/activities/' + habit.id,
        status: 'Upcoming',
        detail: habit.reminder || undefined,
      });
  }
  for (const note of life.learning.filter((n) => n.date === date))
    completed.push({
      id: 'note:' + note.id,
      title: note.topic || 'Learning note',
      kind: 'Learning',
      date,
      path: '/learning',
      status: 'Completed',
      detail: note.minutes ? note.minutes + ' recorded minutes' : undefined,
    });
  for (const job of life.jobs) {
    if (job.date === date)
      completed.push({
        id: 'job:' + job.id,
        title: job.company + ' · ' + job.position,
        kind: 'Application',
        date,
        path: '/jobs/' + job.id,
        status: 'Completed',
      });
    for (const follow of job.followUps ?? []) {
      const done = follow.done && follow.completedOn <= date;
      if (follow.done && follow.completedOn === date)
        completed.push({
          id: 'follow:' + follow.id,
          title: follow.title,
          kind: 'Follow-up',
          date,
          path: '/jobs/' + job.id,
          status: 'Completed',
          detail: job.company,
        });
      if (!done && follow.date <= date)
        attention.push({
          id: 'follow:' + follow.id,
          title: follow.title,
          kind: 'Follow-up',
          date: follow.date,
          path: '/jobs/' + job.id,
          status: follow.date < date ? 'Overdue' : pending,
          detail: job.company,
          jobId: job.id,
          followUpId: follow.id,
        });
      if (!(follow.done && follow.completedOn <= next) && follow.date === next)
        tomorrow.push({
          id: 'follow:' + follow.id,
          title: follow.title,
          kind: 'Follow-up',
          date: next,
          path: '/jobs/' + job.id,
          status: 'Upcoming',
          detail: job.company,
          jobId: job.id,
          followUpId: follow.id,
        });
    }
  }
  for (const goal of life.goals) {
    const progress = goalProgressAt(data, goal.id, date);
    if (
      goal.deadline &&
      goal.deadline <= date &&
      progress < 100 &&
      goal.startDate <= date &&
      goal.status !== 'paused'
    )
      attention.push({
        id: 'goal:' + goal.id,
        title: goal.title,
        kind: 'Goal deadline',
        date: goal.deadline,
        path: '/goals/' + goal.id,
        status: goal.deadline < date ? 'Overdue' : pending,
        goalId: goal.id,
      });
    if (goal.deadline === next && goalProgressAt(data, goal.id, next) < 100)
      tomorrow.push({
        id: 'goal:' + goal.id,
        title: goal.title,
        kind: 'Goal deadline',
        date: next,
        path: '/goals/' + goal.id,
        status: 'Upcoming',
        goalId: goal.id,
      });
    for (const milestone of goal.milestones)
      if (
        milestone.deadline &&
        !(milestone.done && milestone.completedOn <= date) &&
        milestone.deadline <= date
      )
        attention.push({
          id: 'milestone:' + milestone.id,
          title: milestone.title,
          kind: 'Milestone',
          date: milestone.deadline,
          path: '/goals/' + goal.id,
          status: milestone.deadline < date ? 'Overdue' : pending,
          detail: goal.title,
          goalId: goal.id,
        });
  }
  for (const e of life.goalEvents.filter(
    (e) => e.date === date && e.to > e.from && e.to <= goalProgressAt(data, e.goalId, date),
  ))
    completed.push({
      id: 'progress:' + e.id,
      title: life.goals.find((g) => g.id === e.goalId)?.title || 'Goal',
      kind: e.to === 100 ? 'Goal completed' : 'Goal progress',
      date,
      path: '/goals/' + e.goalId,
      status: 'Completed',
      detail: (e.label || 'Progress updated') + ' · ' + e.to + '%',
      goalId: e.goalId,
    });
  for (const t of life.transactions.filter((t) => t.date === date && t.kind !== 'transfer'))
    completed.push({
      id: 'money:' + t.id,
      title: t.description || t.source || t.category,
      kind: t.kind === 'income' ? 'Income recorded' : 'Expense recorded',
      date,
      path: '/finance',
      status: 'Completed',
    });
  for (const j of life.journal.filter((j) => j.date === date))
    completed.push({
      id: 'journal:' + j.id,
      title: 'Personal journal',
      kind: 'Journal',
      date,
      path: '/journal',
      status: 'Completed',
    });
  const money = financeTotals(life, date, date),
    categories = groupMoney(
      life.transactions.filter((t) => t.date === date),
      'expense',
    );
  const warnings = life.budgets
    .filter((b) => b.month === date.slice(0, 7))
    .flatMap((b) => {
      const spent = life.transactions
        .filter(
          (t) =>
            t.kind === 'expense' &&
            t.date >= monthStart(date) &&
            t.date <= date &&
            (!b.category || t.category === b.category),
        )
        .reduce((n, t) => n + t.amount, 0);
      return spent >= b.amount * 0.9
        ? [
            {
              category: b.category || 'Overall spending',
              spent,
              limit: b.amount,
              over: spent > b.amount,
            },
          ]
        : [];
    });
  const learning = life.learning.filter((n) => n.date === date);
  return {
    date,
    today,
    dayEnded,
    completed,
    attention,
    tomorrow,
    finance: { ...money, categories, warnings },
    learning: {
      notes: learning.length,
      topics: learning.map((n) => n.topic || 'Untitled note'),
      minutes: learning.reduce((n, e) => n + e.minutes, 0),
    },
    overview: {
      tasksCompleted: completed.filter((e) => e.kind === 'Task').length,
      tasksPending: attention.filter((e) => e.kind === 'Task' && e.status === 'Pending').length,
      tasksMissed: attention.filter(
        (e) => e.kind === 'Task' && ['Missed', 'Overdue'].includes(e.status),
      ).length,
      streaksCompleted: completed.filter((e) => e.kind === 'Streak').length,
      streaksMissed: attention.filter((e) => e.kind === 'Streak' && e.status === 'Missed').length,
      streaksPending: attention.filter((e) => e.kind === 'Streak' && e.status === 'Pending').length,
      learning: learning.length,
      applications: life.jobs.filter((j) => j.date === date).length,
      expenses: life.transactions.filter((t) => t.kind === 'expense' && t.date === date).length,
      goalsProgressed: new Set(completed.filter((e) => e.goalId).map((e) => e.goalId)).size,
    },
  };
}
export type DailyReport = ReturnType<typeof dailyReport>;
export function reportBundle(
  data: AppData,
  period: 'day' | 'week' | 'month',
  date: string,
  today = todayKey(data.preferences.timeZone),
) {
  const range = period === 'day' ? { start: date, end: date } : reportRange(period, date);
  const end = range.end < today ? range.end : today;
  const prior =
    period === 'day'
      ? { start: addDays(date, -1), end: addDays(date, -1) }
      : previousRange(period, date);
  const summary = lifeReport(data, range.start, end);
  const days = range.start <= end ? datesBetween(range.start, end) : [];
  const missedHabits = data.activities
    .map((a) => ({
      id: a.id,
      title: a.name,
      count: days.filter(
        (d) =>
          missedOn(a, data.completions, d, today) &&
          (!['weekly', 'monthly'].includes(a.frequency) ||
            periods(a, data.completions, d).at(-1)?.end === d),
      ).length,
    }))
    .filter((a) => a.count)
    .sort((a, b) => b.count - a.count);
  const tasks = data.todos ?? [];
  const during = (d: string) => d >= range.start && d <= end;
  return {
    period,
    date,
    today,
    range,
    end,
    summary,
    previous: lifeReport(data, prior.start, prior.end),
    daily: dailyReport(data, date, today),
    categories: groupMoney(
      data.life!.transactions.filter((t) => during(t.date)),
      'expense',
    ),
    tasksPending: tasks.filter(
      (t) => taskDay(t) && during(taskDay(t)) && taskDay(t) >= today && !t.done,
    ).length,
    tasksMissed: tasks.filter(
      (t) =>
        taskDay(t) &&
        during(taskDay(t)) &&
        taskDay(t) < today &&
        (!t.done || !t.completedOn || t.completedOn > taskDay(t)),
    ).length,
    followUpsCompleted: data
      .life!.jobs.flatMap((j) => j.followUps ?? [])
      .filter((f) => f.done && during(f.completedOn)).length,
    followUpsOverdue: data
      .life!.jobs.flatMap((j) => j.followUps ?? [])
      .filter((f) => f.date <= end && (!f.done || f.completedOn > end)).length,
    missedHabits,
  };
}
export type ReportBundle = ReturnType<typeof reportBundle>;
