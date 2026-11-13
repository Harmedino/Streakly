import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Account, Goal, LearningEntry } from '../models/life';
import { Activity, emptyData } from '../models/tracker';
import { money } from '../utils/finance';
import { lifeReport } from '../utils/life-reports';
import { LifeService } from './life';
import { PRE_RESTORE_KEY, STORAGE_KEY, StorageService, validateData } from './storage';
import { TrackerService } from './tracker';
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 13, 12));
  TestBed.configureTestingModule({});
});
afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const a: Activity = {
  id: 'learn',
  name: 'Study',
  description: '',
  icon: '📖',
  color: '#57764b',
  category: 'Learning',
  startDate: '2026-11-01',
  frequency: 'daily',
  weekdays: [1],
  periodTarget: 1,
  interval: 1,
  quantityTarget: 60,
  unit: 'minutes',
  progressType: 'duration',
  reminder: '',
  archived: false,
  updatedAt: '',
};
const entry = (id: string, minutes: number): LearningEntry => ({
  id,
  topic: 'TypeScript',
  description: 'Learning types',
  category: 'Coding',
  minutes,
  date: '2026-11-13',
  resources: 'https://www.typescriptlang.org/',
  notes: '',
  next: 'Generics',
  activityId: a.id,
});
it('reconciles linked learning on create, edit and delete without duplicating manual streak history', () => {
  const l = TestBed.inject(LifeService),
    t = l.tracker;
  t.saveActivity(a);
  t.record(a, '2026-11-13', 10, 'Manual note');
  expect(l.saveLearning(entry('one', 30))).toBe(true);
  expect(l.saveLearning(entry('two', 20))).toBe(true);
  expect(t.data().completions).toHaveLength(1);
  expect(t.entry(a)?.quantity).toBe(60);
  expect(l.saveLearning(entry('one', 40))).toBe(true);
  expect(t.entry(a)?.quantity).toBe(70);
  l.remove('learning', 'two');
  expect(t.entry(a)?.quantity).toBe(50);
  l.remove('learning', 'one');
  expect(t.entry(a)).toMatchObject({ quantity: 10, note: 'Manual note' });
});
it('manual corrections to a learning-linked total do not add the journal minutes twice', () => {
  const l = TestBed.inject(LifeService),
    t = l.tracker;
  t.saveActivity(a);
  l.saveLearning(entry('one', 30));
  t.record(a, '2026-11-13', 45, 'Corrected total');
  l.saveLearning(entry('one', 40));
  expect(t.entry(a)?.quantity).toBe(55);
  l.remove('learning', 'one');
  expect(t.entry(a)?.quantity).toBe(15);
});
it('does not persist invalid finance changes or let account deletion orphan records', () => {
  const l = TestBed.inject(LifeService);
  const account: Account = {
    id: 'a',
    name: 'Bank',
    type: 'bank',
    openingBalance: money('100'),
    openingDate: '2026-11-01',
  };
  expect(l.saveAccount(account)).toBe(true);
  expect(
    l.saveTransaction({
      id: 't',
      kind: 'income',
      amount: money('10'),
      date: '2026-11-02',
      source: 'Gift',
      category: 'Gifts',
      description: '',
      accountId: 'a',
      toAccountId: '',
    }),
  ).toBe(true);
  expect(l.remove('accounts', 'a')).toBe(false);
  expect(l.data().accounts).toHaveLength(1);
  expect(
    l.saveTransaction({
      id: 'bad',
      kind: 'transfer',
      amount: 100,
      date: '2026-11-03',
      source: '',
      category: 'Transfer',
      description: '',
      accountId: 'a',
      toAccountId: 'a',
    }),
  ).toBe(false);
  expect(l.data().transactions).toHaveLength(1);
});
it('posts recurring occurrences once, even after a posted transaction is deleted', () => {
  const l = TestBed.inject(LifeService);
  l.saveRecurring({
    id: 'r',
    kind: 'income',
    amount: 10000,
    startDate: '2026-10-31',
    source: 'Freelance',
    category: 'Freelancing',
    description: '',
    accountId: '',
    active: true,
    posted: [],
  });
  expect(l.postRecurring()).toBe(true);
  expect(l.data().transactions).toHaveLength(1);
  l.postRecurring();
  expect(l.data().transactions).toHaveLength(1);
  l.remove('transactions', l.data().transactions[0].id);
  l.postRecurring();
  expect(l.data().transactions).toHaveLength(0);
});
it('preserves all legacy streak, task and daily-note data during migration and round trip', () => {
  const old = {
    ...emptyData(),
    version: 2,
    activities: [a],
    dailyNotes: { '2026-11-12': 'Keep me' },
    completions: [{ activityId: a.id, date: '2026-11-12', quantity: 60, note: 'Original' }],
  };
  delete old.life;
  const migrated = validateData(old);
  expect(migrated.version).toBe(3);
  expect(migrated.completions).toEqual(old.completions);
  expect(migrated.dailyNotes).toEqual(old.dailyNotes);
  expect(validateData(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
});
it('creates a pre-replacement safety backup and refuses replacement if that backup cannot be saved', () => {
  const t = TestBed.inject(TrackerService);
  t.addTodo('Keep the original');
  const old = localStorage.getItem(STORAGE_KEY)!;
  expect(t.import(emptyData())).toBe(true);
  expect(localStorage.getItem(PRE_RESTORE_KEY)).toBe(old);
  const current = localStorage.getItem(STORAGE_KEY);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Full');
  });
  expect(t.import(emptyData())).toBe(false);
  expect(localStorage.getItem(STORAGE_KEY)).toBe(current);
});
it('resets finance without deleting habits or the planner and clears linked goal references', () => {
  const l = TestBed.inject(LifeService),
    t = l.tracker;
  t.saveActivity(a);
  t.addTodo('Keep task');
  l.saveAccount({
    id: 'a',
    name: 'Bank',
    type: 'bank',
    openingBalance: 10000,
    openingDate: '2026-11-01',
  });
  expect(t.resetSection('finance')).toBe(true);
  expect(t.data().activities).toHaveLength(1);
  expect(t.data().todos).toHaveLength(1);
  expect(t.data().life?.accounts).toEqual([]);
  expect(new StorageService().load().life?.accounts).toEqual([]);
});
it('reports real planner completions and goal progress events rather than guessing history', () => {
  const l = TestBed.inject(LifeService),
    t = l.tracker;
  t.addTodo('Done');
  t.toggleTodo(t.data().todos![0].id);
  const goal: Goal = {
    id: 'g',
    title: 'Learn',
    description: '',
    category: 'Learning',
    startDate: '2026-11-01',
    deadline: '2026-12-01',
    priority: 'high',
    progress: 0,
    status: 'active',
    milestones: [{ id: 'm', title: 'Read', done: false, completedOn: '' }],
    activityId: '',
    savingsId: '',
    learningCategory: 'Coding',
    updatedOn: '2026-11-13',
  };
  expect(l.saveGoal(goal)).toBe(true);
  expect(l.toggleMilestone(l.data().goals[0], 'm')).toBe(true);
  expect(lifeReport(t.data(), '2026-11-01', '2026-11-13')).toMatchObject({
    tasksCompleted: 1,
    goalsProgressed: 1,
    goalsCompleted: 1,
    learningMinutes: 0,
    income: 0,
    expenses: 0,
  });
});
it('rejects malformed new modules and duplicate identifiers without modifying the original saved data', () => {
  const d = emptyData();
  d.life!.accounts = [
    { id: 'a', name: 'Bank', type: 'bank', openingBalance: 100, openingDate: '2026-11-01' },
    { id: 'a', name: 'Again', type: 'cash', openingBalance: 100, openingDate: '2026-11-01' },
  ];
  expect(() => validateData(d)).toThrow('duplicate');
  expect(localStorage.getItem(STORAGE_KEY)).toBe(null);
});

it('reconciles learning when a streak changes type and blocks incompatible linked schedules', () => {
  const l = TestBed.inject(LifeService),
    t = l.tracker;
  t.saveActivity(a);
  t.record(a, '2026-11-13', 10, 'Manual base');
  l.saveLearning(entry('one', 30));
  const binary: Activity = { ...a, progressType: 'binary', quantityTarget: 1 };
  expect(t.saveActivity(binary)).toBe(true);
  expect(t.entry(binary)?.quantity).toBe(1);
  expect(() => validateData(t.data())).not.toThrow();
  expect(t.saveActivity({ ...binary, frequency: 'once' })).toBe(false);
  expect(t.saveActivity({ ...a, progressType: 'quantity', quantityTarget: 20 })).toBe(false);
  expect(l.remove('learning', 'one')).toBe(true);
  expect(t.entry(binary)).toMatchObject({ quantity: 1, note: 'Manual base' });
});
it('local section reset detaches goal links and removes planner-derived milestone credits without deleting notes', () => {
  const l = TestBed.inject(LifeService),
    t = l.tracker;
  const g: Goal = {
    id: 'linked',
    title: 'Course',
    description: '',
    category: 'Learning',
    startDate: '2026-11-01',
    deadline: '',
    priority: 'medium',
    progress: 0,
    status: 'active',
    tracking: 'milestones',
    milestones: [{ id: 'step', title: 'Read', done: false, manualDone: false, completedOn: '' }],
    activityId: '',
    savingsId: '',
    learningCategory: '',
    updatedOn: '2026-11-13',
  };
  expect(l.saveGoal(g)).toBe(true);
  expect(t.addTodo('Read', '', '', 'medium', 'linked', 'step', true)).toBe(true);
  t.toggleTodo(t.data().todos![0].id);
  expect(l.data().goals[0].progress).toBe(100);
  expect(t.resetSection('planner')).toBe(true);
  expect(l.data().goals[0].progress).toBe(0);
  expect(t.addTodo('Keep me', '', '', 'medium', 'linked')).toBe(true);
  expect(t.resetSection('goals')).toBe(true);
  expect(t.data().todos![0].goalId).toBe('');
});
