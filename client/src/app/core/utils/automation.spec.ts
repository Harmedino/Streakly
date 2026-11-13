import { expect, it } from 'vitest';
import { markdown } from '../../shared/components/markdown/markdown.component';
import { Activity, emptyData } from '../models/tracker';
import { reconcileAutomation } from './automation';
import { todayKey } from './dates';
const date = '2026-11-13';
const habit = (
  trigger: NonNullable<Activity['automation']>['trigger'],
  frequency: Activity['frequency'] = 'daily',
): Activity => ({
  id: trigger,
  name: trigger,
  description: '',
  icon: '🌱',
  color: '#8270b2',
  category: 'Personal',
  startDate: '2026-11-01',
  frequency,
  weekdays: [1],
  periodTarget: 2,
  interval: 1,
  quantityTarget: 1,
  progressType: 'binary',
  unit: '',
  reminder: '',
  archived: false,
  updatedAt: '',
  automation: { trigger, minimum: 0 },
});
it('qualifies only the matching application events, including all five automation types', () => {
  const d = emptyData();
  d.activities = ['learning', 'jobs', 'expenses', 'journal', 'planning'].map((t) =>
    habit(t as any),
  );
  d.activities.push({ ...habit('learning'), id: 'manual', automation: undefined });
  const l = d.life!;
  l.learning = [
    {
      id: 'n',
      topic: '',
      description: 'A note',
      category: '',
      minutes: 0,
      date,
      resources: '',
      notes: '',
      next: '',
      activityId: '',
    },
  ];
  l.jobs = [
    {
      id: 'j',
      company: 'Acme',
      position: 'Engineer',
      date,
      link: '',
      status: 'Applied',
      notes: '',
    },
  ];
  l.transactions = [
    {
      id: 'e',
      kind: 'expense',
      amount: 100,
      date,
      source: '',
      category: 'Food',
      description: '',
      accountId: '',
      toAccountId: '',
    },
  ];
  l.journal = [
    {
      id: 'r',
      date,
      accomplished: 'One good thing',
      learned: '',
      challenges: '',
      ideas: '',
      improve: '',
      tomorrow: '',
      mood: 4,
    },
  ];
  d.todos = [
    {
      id: 't',
      title: 'Plan',
      done: true,
      dueDate: '',
      createdAt: date + 'T10:00:00Z',
      updatedAt: date + 'T10:00:00Z',
      completedOn: date,
    },
  ];
  reconcileAutomation(d);
  expect(d.completions).toHaveLength(5);
  expect(d.completions.some((c) => c.activityId === 'manual')).toBe(false);
  reconcileAutomation(d);
  expect(d.completions).toHaveLength(5);
});
it('preserves the manual base and removes automatic progress after a source is deleted', () => {
  const d = emptyData();
  d.activities = [habit('jobs')];
  d.completions = [{ activityId: 'jobs', date, quantity: 1, note: 'Manual base' }];
  d.life!.jobs = [
    {
      id: 'j',
      company: 'Acme',
      position: 'Engineer',
      date,
      link: '',
      status: 'Applied',
      notes: '',
    },
  ];
  reconcileAutomation(d);
  d.life!.jobs = [];
  reconcileAutomation(d);
  expect(d.completions).toEqual([{ activityId: 'jobs', date, quantity: 1, note: 'Manual base' }]);
  expect(d.autoCredits).toEqual([]);
});
it('supports weekly rules, minimums, source date edits, rest days and archive behavior', () => {
  const d = emptyData();
  d.activities = [
    { ...habit('learning', 'weekly'), automation: { trigger: 'learning', minimum: 30 } },
  ];
  const note = {
    id: 'n',
    topic: 'Topic',
    description: 'Content',
    category: 'Learning',
    minutes: 20,
    date,
    resources: '',
    notes: '',
    next: '',
    activityId: '',
  };
  d.life!.learning = [note];
  reconcileAutomation(d);
  expect(d.completions).toHaveLength(0);
  note.minutes = 40;
  reconcileAutomation(d);
  expect(d.completions[0].date).toBe(date);
  note.date = '2026-11-12';
  reconcileAutomation(d);
  expect(d.completions).toHaveLength(1);
  expect(d.completions[0].date).toBe('2026-11-12');
  d.activities[0].archived = true;
  note.date = date;
  reconcileAutomation(d);
  expect(d.completions).toHaveLength(0);
  d.activities[0].archived = false;
  d.activities[0].restDays = [date];
  reconcileAutomation(d);
  expect(d.completions).toHaveLength(0);
});
it('uses the configured calendar time zone across leap-day and midnight boundaries', () => {
  const time = new Date('2024-02-29T23:30:00Z');
  expect(todayKey('Africa/Lagos', time)).toBe('2024-03-01');
  expect(todayKey('America/New_York', time)).toBe('2024-02-29');
});
it('renders note formatting while escaping HTML and rejecting executable link schemes', () => {
  const html = markdown(
    '## Heading\n**Bold** and *italic*\n- [x] Done\n```\n<script>alert(1)</script>\n```\n[bad](javascript:alert(1))\n[Good](https://angular.dev)',
  );
  expect(html).toContain('<h3>Heading</h3>');
  expect(html).toContain('<strong>Bold</strong>');
  expect(html).toContain('☑');
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('href="javascript:');
  expect(html).toContain('href="https://angular.dev"');
});
