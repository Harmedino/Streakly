import { expect, it } from 'vitest';
import { Goal } from '../models/life';
import { emptyData } from '../models/tracker';
import { dailyReport, reportBundle } from './daily-report';
import { validateData } from './data-validation';
import { goalPercent, reconcileWorkflows } from './workflows';
const now = new Date('2026-11-13T14:00:00Z');
function goal(extra: Partial<Goal> = {}): Goal {
  return {
    id: 'g',
    title: 'Finish Module 1',
    description: '',
    category: 'Learning',
    startDate: '2026-11-01',
    deadline: '',
    priority: 'medium',
    progress: 0,
    status: 'active',
    milestones: [],
    activityId: '',
    savingsId: '',
    learningCategory: '',
    updatedOn: '2026-11-01',
    tracking: 'simple',
    source: 'manual',
    ...extra,
  };
}
function data() {
  const d = emptyData();
  d.preferences.timeZone = 'Africa/Lagos';
  return d;
}
function task(id: string, date = '2026-11-13') {
  return {
    id,
    title: 'Task ' + id,
    done: false,
    dueDate: '',
    scheduledDate: date,
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: now.toISOString(),
  };
}
it('simple completion and undo create accurate goal history and daily completed activities', () => {
  const d = data();
  d.life!.goals = [goal()];
  const before = structuredClone(d);
  d.life!.goals[0].progress = 100;
  reconcileWorkflows(d, before, now);
  expect(goalPercent(d.life!.goals[0])).toBe(100);
  expect(d.life!.goals[0].status).toBe('completed');
  expect(
    dailyReport(d, '2026-11-13', '2026-11-13').completed.some((e) => e.kind === 'Goal completed'),
  ).toBe(true);
  const done = structuredClone(d);
  d.life!.goals[0].progress = 0;
  reconcileWorkflows(d, done, now);
  expect(d.life!.goals[0].status).toBe('active');
  expect(d.life!.goalEvents).toHaveLength(2);
});
it('two of five milestones produce 40%, preserving IDs through reorder and title edits', () => {
  const d = data();
  d.life!.goals = [
    goal({
      tracking: 'milestones',
      milestones: Array.from({ length: 5 }, (_, i) => ({
        id: 'm' + i,
        title: 'Module ' + i,
        done: i < 2,
        completedOn: i < 2 ? '2026-11-13' : '',
        manualDone: i < 2,
      })),
    }),
  ];
  reconcileWorkflows(d, data(), now);
  expect(goalPercent(d.life!.goals[0])).toBe(40);
  const before = structuredClone(d);
  d.life!.goals[0].milestones.reverse();
  d.life!.goals[0].milestones[4].title = 'Updated module';
  reconcileWorkflows(d, before, now);
  expect(goalPercent(d.life!.goals[0])).toBe(40);
  expect(d.life!.goals[0].milestones[4].id).toBe('m0');
});
it('numeric goals use exact progress and source events rather than adding credits twice', () => {
  const d = data();
  d.life!.goals = [goal({ tracking: 'numeric', target: 30, current: 12, unit: 'applications' })];
  reconcileWorkflows(d, data(), now);
  expect(goalPercent(d.life!.goals[0])).toBe(40);
  d.life!.goals[0].source = 'applications';
  d.life!.jobs = [
    {
      id: 'j',
      company: 'Company',
      position: 'Engineer',
      date: '2026-11-13',
      status: 'Applied',
      link: '',
      notes: '',
    },
  ];
  reconcileWorkflows(d, structuredClone(d), now);
  expect(d.life!.goals[0].current).toBe(1);
  const before = structuredClone(d);
  reconcileWorkflows(d, before, now);
  expect(d.life!.goals[0].current).toBe(1);
  d.life!.jobs = [];
  reconcileWorkflows(d, before, now);
  expect(d.life!.goals[0].current).toBe(0);
});
it('linked task completions, duplicates and undo preserve the independent manual milestone base', () => {
  const d = data();
  d.life!.goals = [
    goal({
      tracking: 'milestones',
      milestones: [{ id: 'm', title: 'Module', done: false, completedOn: '', manualDone: false }],
    }),
  ];
  d.todos = [
    { ...task('a'), goalId: 'g', milestoneId: 'm', syncMilestone: true },
    { ...task('b'), goalId: 'g', milestoneId: 'm', syncMilestone: true },
  ];
  let before = structuredClone(d);
  d.todos.forEach((t) => (t.done = true));
  reconcileWorkflows(d, before, now);
  expect(goalPercent(d.life!.goals[0])).toBe(100);
  expect(d.life!.goalEvents).toHaveLength(1);
  before = structuredClone(d);
  d.todos[0].done = false;
  reconcileWorkflows(d, before, now);
  expect(goalPercent(d.life!.goals[0])).toBe(100);
  before = structuredClone(d);
  d.todos[1].done = false;
  reconcileWorkflows(d, before, now);
  expect(goalPercent(d.life!.goals[0])).toBe(0);
});
it('goal deletion detaches linked notes and tasks without deleting them', () => {
  const d = data();
  d.life!.goals = [goal()];
  d.todos = [{ ...task('a'), goalId: 'g' }];
  const before = structuredClone(d);
  d.life!.goals = [];
  reconcileWorkflows(d, before, now);
  expect(d.todos[0].goalId).toBe('');
  expect(d.todos).toHaveLength(1);
});
it('job status changes append an immutable audit event, and follow-ups have completion dates', () => {
  const d = data();
  d.life!.jobs = [
    {
      id: 'j',
      company: 'Acme',
      position: 'Engineer',
      date: '2026-11-03',
      status: 'Applied',
      link: '',
      notes: '',
      followUps: [
        { id: 'f', title: 'Call recruiter', date: '2026-11-13', done: false, completedOn: '' },
      ],
    },
  ];
  reconcileWorkflows(d, data(), now);
  const before = structuredClone(d);
  d.life!.jobs[0].status = 'Interview';
  d.life!.jobs[0].timeline = [];
  d.life!.jobs[0].followUps![0].done = true;
  reconcileWorkflows(d, before, now);
  expect(d.life!.jobs[0].timeline!.map((e) => e.status)).toEqual(['Applied', 'Interview']);
  expect(d.life!.jobs[0].followUps![0].completedOn).toBe('2026-11-13');
  expect(
    dailyReport(d, '2026-11-13', '2026-11-13').completed.some((e) => e.kind === 'Follow-up'),
  ).toBe(true);
});
it('three scheduled tasks give one completion and two pending today, then two missed after the day ends', () => {
  const d = data();
  d.todos = [{ ...task('1'), done: true, completedOn: '2026-11-13' }, task('2'), task('3')];
  let r = dailyReport(d, '2026-11-13', '2026-11-13');
  expect(r.overview).toMatchObject({ tasksCompleted: 1, tasksPending: 2, tasksMissed: 0 });
  r = dailyReport(d, '2026-11-13', '2026-11-14');
  expect(r.overview).toMatchObject({ tasksCompleted: 1, tasksPending: 0, tasksMissed: 2 });
});
it('unscheduled records never become missed, future days remain upcoming, and late completions do not rewrite the past', () => {
  const d = data();
  d.todos = [
    { ...task('none', ''), done: false },
    { ...task('late'), done: true, completedOn: '2026-11-14' },
  ];
  const past = dailyReport(d, '2026-11-13', '2026-11-15');
  expect(past.overview.tasksMissed).toBe(1);
  expect(past.completed.filter((e) => e.kind === 'Task')).toHaveLength(0);
  const future = dailyReport(d, '2026-11-13', '2026-11-12');
  expect(future.attention.every((e) => e.status === 'Upcoming')).toBe(true);
});
it('historical schedules survive rescheduling and reports distinguish explicit reminders from absent data', () => {
  const d = data();
  d.todos = [task('a', '2026-11-12')];
  const before = structuredClone(d);
  d.todos[0].scheduledDate = '2026-11-14';
  reconcileWorkflows(d, before, now);
  expect(dailyReport(d, '2026-11-12', '2026-11-13').attention).toHaveLength(1);
  expect(dailyReport(d, '2026-11-13', '2026-11-13').attention).toHaveLength(0);
  expect(dailyReport(d, '2026-11-13', '2026-11-13').tomorrow[0].title).toBe('Task a');
});
it('reports use the configured time zone at midnight and preserve legacy goal/journal/note fields', () => {
  const d = data();
  d.life!.goals = [goal({ tracking: undefined, progress: 50 })];
  d.life!.journal = [
    {
      id: 'old',
      date: '2026-11-12',
      accomplished: 'Original journal',
      learned: '',
      challenges: '',
      ideas: '',
      improve: '',
      tomorrow: '',
      mood: null,
    },
  ];
  const valid = validateData(d);
  expect(valid.life!.journal[0].accomplished).toBe('Original journal');
  expect(goalPercent(valid.life!.goals[0])).toBe(50);
  d.todos = [task('a', '2026-11-13')];
  const r = reportBundle(d, 'day', '2026-11-13', '2026-11-14');
  expect(r.daily.overview.tasksMissed).toBe(1);
});
it('reconciles a browser-derived milestone snapshot on the server without converting task credits into manual completion', () => {
  const d = data();
  d.life!.goals = [
    goal({
      tracking: 'milestones',
      milestones: [{ id: 'm', title: 'Module', done: false, manualDone: false, completedOn: '' }],
    }),
  ];
  d.todos = [{ ...task('a'), goalId: 'g', milestoneId: 'm', syncMilestone: true }];
  const previous = structuredClone(d);
  d.todos[0].done = true;
  reconcileWorkflows(d, previous, now);
  reconcileWorkflows(d, previous, now);
  expect(d.life!.goals[0].milestones[0].manualDone).toBe(false);
  const completed = structuredClone(d);
  d.todos[0].done = false;
  reconcileWorkflows(d, completed, now);
  reconcileWorkflows(d, completed, now);
  expect(d.life!.goals[0].progress).toBe(0);
});
it('rejects empty rich-text markup without treating it as a learning event', () => {
  const d = data();
  d.life!.learning = [
    {
      id: 'n',
      topic: 'Title only',
      format: 'html',
      description: '<p><br></p>',
      notes: '',
      category: '',
      minutes: 0,
      date: '2026-11-13',
      resources: '',
      next: '',
      activityId: '',
    },
  ];
  expect(() => validateData(d)).toThrow('note content');
});
it('corrects an application date without erasing status history or mutating the previous snapshot', () => {
  const d = data();
  d.life!.jobs = [
    {
      id: 'j',
      company: 'Acme',
      position: 'Engineer',
      date: '2026-11-03',
      status: 'Applied',
      link: '',
      notes: '',
    },
  ];
  reconcileWorkflows(d, data(), now);
  const old = structuredClone(d);
  d.life!.jobs[0].date = '2026-11-04';
  reconcileWorkflows(d, old, now);
  expect(d.life!.jobs[0].timeline![0].date).toBe('2026-11-04');
  expect(old.life!.jobs[0].timeline![0].date).toBe('2026-11-03');
});
