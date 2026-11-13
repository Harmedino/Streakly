import { LifeData } from '../models/life';
import { AppData } from '../models/tracker';
import { validDate } from './dates';
import { JOB_STATUSES } from './workflows';
const text = (s: unknown, max = 1000): s is string => typeof s === 'string' && s.length <= max;
function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
const stamp = (v: unknown) => v === undefined || (text(v, 50) && Number.isFinite(Date.parse(v)));
function unique(rows: { id: string }[], label: string) {
  check(
    Array.isArray(rows) &&
      rows.length <= 10000 &&
      rows.every((r) => r && text(r.id, 100) && r.id.trim()) &&
      new Set(rows.map((r) => r.id)).size === rows.length,
    'Invalid or duplicate ' + label + '.',
  );
}
export function validateWorkflows(life: LifeData, today: string) {
  for (const goal of life.goals) {
    check(
      goal.tracking === undefined || ['simple', 'milestones', 'numeric'].includes(goal.tracking),
      'Choose a goal tracking method.',
    );
    check(
      goal.source === undefined ||
        ['manual', 'applications', 'learning', 'savings', 'streak'].includes(goal.source),
      'Choose a valid goal progress source.',
    );
    check(
      goal.target === undefined ||
        (Number.isFinite(goal.target) && goal.target > 0 && goal.target <= 1e12),
      'Numeric goals need a positive target.',
    );
    check(
      goal.current === undefined ||
        (Number.isFinite(goal.current) && goal.current >= 0 && goal.current <= 1e12),
      'Goal progress cannot be negative.',
    );
    check(goal.unit === undefined || text(goal.unit, 40), 'Use a shorter goal unit.');
    check(stamp(goal.completedAt), 'Invalid goal completion timestamp.');
    for (const m of goal.milestones) {
      check(
        m.deadline === undefined || m.deadline === '' || validDate(m.deadline),
        'Invalid milestone deadline.',
      );
      check(
        m.manualDone === undefined || typeof m.manualDone === 'boolean',
        'Invalid milestone completion.',
      );
      check(
        m.taskIds === undefined ||
          (Array.isArray(m.taskIds) && m.taskIds.every((id) => text(id, 100))),
        'Invalid milestone task credits.',
      );
      check(stamp(m.completedAt), 'Invalid milestone timestamp.');
    }
  }
  for (const note of life.learning) {
    check(
      note.format === undefined || ['markdown', 'html'].includes(note.format),
      'Unsupported note format.',
    );
    check(note.goalId === undefined || text(note.goalId, 100), 'Invalid related goal.');
    check(
      !note.goalId || life.goals.some((g) => g.id === note.goalId),
      'The related goal no longer exists. Choose another goal or unlink it.',
    );
    check(
      !note.milestoneId ||
        life.goals
          .find((g) => g.id === note.goalId)
          ?.milestones.some((m) => m.id === note.milestoneId),
      'Choose a milestone from the related goal.',
    );
  }
  for (const job of life.jobs) {
    check(JOB_STATUSES.includes(job.status), 'Choose a valid application status.');
    check(job.salary === undefined || text(job.salary, 200), 'Salary information is too long.');
    check(job.location === undefined || text(job.location, 200), 'Location is too long.');
    check(
      job.interview === undefined || text(job.interview, 5000),
      'Interview details are too long.',
    );
    unique(job.timeline ?? [], 'application timeline events');
    for (const e of job.timeline ?? [])
      check(
        validDate(e.date) &&
          e.date >= job.date &&
          e.date <= today &&
          text(e.title, 200) &&
          e.title.trim() &&
          text(e.note, 5000) &&
          ['status', 'note'].includes(e.kind) &&
          (!e.status || JOB_STATUSES.includes(e.status)) &&
          stamp(e.at),
        'Timeline events need a title and a date between the application date and today.',
      );
    unique(job.followUps ?? [], 'follow-ups');
    for (const f of job.followUps ?? [])
      check(
        text(f.title, 200) &&
          f.title.trim() &&
          validDate(f.date) &&
          typeof f.done === 'boolean' &&
          (f.done ? validDate(f.completedOn) && f.completedOn <= today : f.completedOn === '') &&
          stamp(f.completedAt),
        'Follow-ups need a title and a valid date.',
      );
  }
  for (const j of life.journal)
    check(
      (j.content === undefined || text(j.content, 50000)) &&
        stamp(j.createdAt) &&
        stamp(j.updatedAt),
      'Journal content is too long or has an invalid timestamp.',
    );
  for (const e of life.goalEvents)
    check(
      stamp(e.at) &&
        (e.label === undefined || text(e.label, 300)) &&
        (e.milestoneId === undefined || text(e.milestoneId, 100)) &&
        (e.current === undefined || Number.isFinite(e.current)),
      'Invalid goal history.',
    );
}
export function validateTaskLinks(data: AppData) {
  for (const t of data.todos ?? []) {
    unique(t.scheduleHistory ?? [], 'task schedule events');
    for (const e of t.scheduleHistory ?? [])
      check(
        validDate(e.date) &&
          stamp(e.at) &&
          [e.from, e.to, e.fromDue, e.toDue].every((d) => d === '' || validDate(d)),
        'Invalid task schedule history.',
      );
    check(
      stamp(t.completedAt) &&
        (t.syncMilestone === undefined || typeof t.syncMilestone === 'boolean'),
      'Invalid task completion details.',
    );
    check(
      !t.goalId || data.life!.goals.some((g) => g.id === t.goalId),
      'Choose an existing related goal.',
    );
    check(
      !t.milestoneId ||
        data
          .life!.goals.find((g) => g.id === t.goalId)
          ?.milestones.some((m) => m.id === t.milestoneId),
      'Choose a milestone from this task’s goal.',
    );
  }
  for (const c of data.completions)
    check(stamp(c.completedAt), 'Invalid streak completion timestamp.');
}
