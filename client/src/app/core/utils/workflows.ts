import { Goal, GoalSource, GoalTracking, JobStatus } from '../models/life';
import { AppData } from '../models/tracker';
import { todayKey } from './dates';
import { savingsProgress } from './finance';
export const JOB_STATUSES: JobStatus[] = [
  'Applied',
  'Assessment',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
];
export function goalTracking(goal: Goal): GoalTracking {
  return (
    goal.tracking ??
    (goal.milestones.length
      ? 'milestones'
      : goal.progress > 0 && goal.progress < 100
        ? 'numeric'
        : 'simple')
  );
}
export function goalPercent(goal: Goal): number {
  const type = goalTracking(goal);
  if (type === 'milestones')
    return goal.milestones.length
      ? Math.round((goal.milestones.filter((m) => m.done).length / goal.milestones.length) * 100)
      : 0;
  if (type === 'numeric')
    return Math.min(
      100,
      Math.max(0, Math.round(((goal.current ?? goal.progress) / (goal.target ?? 100)) * 100)),
    );
  return goal.progress >= 100 ? 100 : 0;
}
export function goalActual(
  data: AppData,
  goal: Goal,
  end = todayKey(data.preferences.timeZone),
): number {
  const life = data.life!;
  const during = (date: string) => date >= goal.startDate && date <= end;
  switch (goal.source as GoalSource) {
    case 'applications':
      return life.jobs.filter((j) => during(j.date)).length;
    case 'learning':
      return (
        life.learning
          .filter(
            (n) =>
              during(n.date) && (!goal.learningCategory || n.category === goal.learningCategory),
          )
          .reduce((n, e) => n + e.minutes, 0) / 60
      );
    case 'savings':
      return (
        (goal.savingsId
          ? savingsProgress(life, goal.savingsId, end)
          : life.contributions.filter((c) => c.date <= end).reduce((n, c) => n + c.amount, 0)) / 100
      );
    case 'streak':
      return data.completions.filter(
        (c) =>
          (!goal.activityId || c.activityId === goal.activityId) &&
          during(c.date) &&
          c.quantity >=
            (data.activities.find((a) => a.id === c.activityId)?.quantityTarget ?? Infinity),
      ).length;
    default:
      return goal.current ?? goal.progress;
  }
}
/** One reconciliation per atomic workspace mutation. IDs and previous history are authoritative. */
export function reconcileWorkflows(data: AppData, previous?: AppData, now = new Date()) {
  const life = data.life!;
  const today = todayKey(data.preferences.timeZone, now),
    stamp = now.toISOString();
  for (const task of data.todos ?? []) {
    const old = previous?.todos?.find((t) => t.id === task.id);
    if (old) {
      task.scheduleHistory = structuredClone(old.scheduleHistory ?? []);
      if (task.scheduledDate !== old.scheduledDate || task.dueDate !== old.dueDate)
        task.scheduleHistory.push({
          id: crypto.randomUUID(),
          date: today,
          at: stamp,
          from: old.scheduledDate ?? '',
          to: task.scheduledDate ?? '',
          fromDue: old.dueDate,
          toDue: task.dueDate,
        });
    }
    if (task.done && !old?.done) {
      task.completedOn = task.completedOn || today;
      task.completedAt = previous ? stamp : task.completedAt;
    } else if (task.done && old?.done) {
      task.completedOn = old.completedOn || task.completedOn;
      task.completedAt = old.completedAt;
    } else if (!task.done) {
      task.completedOn = '';
      task.completedAt = undefined;
    }
  }
  for (const job of life.jobs) {
    const old = previous?.life?.jobs.find((j) => j.id === job.id);
    const notes = (job.timeline ?? []).filter((e) => e.kind === 'note');
    const statusEvents =
      old?.timeline?.filter((e) => e.kind === 'status') ??
      job.timeline?.filter((e) => e.kind === 'status') ??
      [];
    job.timeline = [...statusEvents.map((e) => ({ ...e })), ...notes];
    if (old && old.date !== job.date)
      for (const event of job.timeline)
        if (event.kind === 'status' && event.title === 'Application submitted')
          event.date = job.date;
    if (!job.timeline.some((e) => e.kind === 'status'))
      job.timeline.push({
        id: crypto.randomUUID(),
        date: job.date,
        title: 'Application submitted',
        note: '',
        kind: 'status',
        status: 'Applied',
      });
    if ((!old && job.status !== 'Applied') || (old && old.status !== job.status))
      job.timeline.push({
        id: crypto.randomUUID(),
        date: today,
        title: 'Status changed to ' + job.status,
        note: '',
        kind: 'status',
        status: job.status,
        at: stamp,
      });
    for (const follow of job.followUps ?? []) {
      const before = old?.followUps?.find((f) => f.id === follow.id);
      if (follow.done && !before?.done) {
        follow.completedOn = follow.completedOn || today;
        follow.completedAt = previous ? stamp : follow.completedAt;
      } else if (follow.done && before?.done) {
        follow.completedOn = before.completedOn;
        follow.completedAt = before.completedAt;
      } else {
        follow.completedOn = '';
        follow.completedAt = undefined;
      }
    }
  }
  for (const entry of data.completions) {
    const old = previous?.completions.find(
      (c) => c.activityId === entry.activityId && c.date === entry.date,
    );
    const target =
      data.activities.find((a) => a.id === entry.activityId)?.quantityTarget ?? Infinity;
    if (previous && entry.quantity >= target && (!old || old.quantity < target))
      entry.completedAt = stamp;
    else if (old?.completedAt) entry.completedAt = old.completedAt;
  }
  // Detaching a deleted goal or milestone preserves the note/task itself.
  for (const record of [...(data.todos ?? []), ...life.learning]) {
    const oldGoal = previous?.life?.goals.find((g) => g.id === record.goalId);
    if (oldGoal && !life.goals.some((g) => g.id === record.goalId)) {
      record.goalId = '';
      record.milestoneId = '';
    }
    const goal = life.goals.find((g) => g.id === record.goalId);
    if (
      record.milestoneId &&
      oldGoal?.milestones.some((m) => m.id === record.milestoneId) &&
      !goal?.milestones.some((m) => m.id === record.milestoneId)
    )
      record.milestoneId = '';
  }
  // Preserve audited events rather than trusting replacement payloads to rewrite history.
  if (previous)
    life.goalEvents = previous.life!.goalEvents.filter((e) =>
      life.goals.some((g) => g.id === e.goalId),
    );
  for (const goal of life.goals) {
    const old = previous?.life?.goals.find((g) => g.id === goal.id);
    const legacyTracking = goal.tracking === undefined;
    goal.tracking = goalTracking(goal);
    goal.source ??= 'manual';
    if (goal.tracking === 'numeric') {
      goal.target ??= 100;
      goal.current ??= goal.progress;
      goal.unit ||= legacyTracking ? '%' : 'units';
      if (goal.source !== 'manual') {
        goal.current = goalActual(data, goal, today);
        goal.unit = {
          applications: 'applications',
          learning: 'hours',
          savings: data.preferences.currency ?? 'NGN',
          streak: 'check-ins',
        }[goal.source];
      }
    }
    for (const milestone of goal.milestones) {
      const before = old?.milestones.find((m) => m.id === milestone.id);
      const explicitManual = milestone.manualDone !== undefined;
      if (milestone.manualDone === undefined)
        milestone.manualDone = milestone.taskIds?.length ? false : milestone.done;
      if (before && !explicitManual && milestone.done !== before.done)
        milestone.manualDone = milestone.done;
      milestone.taskIds = (data.todos ?? [])
        .filter(
          (t) =>
            t.done && t.syncMilestone && t.goalId === goal.id && t.milestoneId === milestone.id,
        )
        .map((t) => t.id);
      milestone.done = !!milestone.manualDone || milestone.taskIds.length > 0;
      if (milestone.done) {
        milestone.completedOn = milestone.completedOn || today;
        milestone.completedAt = before?.done
          ? before.completedAt
          : previous
            ? stamp
            : milestone.completedAt;
      } else {
        milestone.completedOn = '';
        milestone.completedAt = undefined;
      }
    }
    const from = old ? goalPercent(old) : 0;
    goal.progress = goalPercent(goal);
    if (goal.progress === 100) {
      goal.status = 'completed';
      goal.completedAt =
        old?.status === 'completed' ? old.completedAt : previous ? stamp : goal.completedAt;
    } else {
      if (goal.status === 'completed') goal.status = 'active';
      goal.completedAt = undefined;
    }
    const changes = goal.milestones.filter((m) =>
      old ? old.milestones.find((x) => x.id === m.id)?.done !== m.done : m.done,
    );
    if (
      previous &&
      (from !== goal.progress || changes.length || (old && old.current !== goal.current))
    ) {
      goal.updatedOn = today;
      life.goalEvents.push({
        id: crypto.randomUUID(),
        goalId: goal.id,
        date: today,
        from,
        to: goal.progress,
        at: stamp,
        label:
          changes.length === 1
            ? (changes[0].done ? 'Completed: ' : 'Reopened: ') + changes[0].title
            : goal.progress === 100
              ? 'Goal completed'
              : 'Progress updated',
        milestoneId: changes.length === 1 ? changes[0].id : undefined,
        current: goal.current,
      });
    }
  }
}
