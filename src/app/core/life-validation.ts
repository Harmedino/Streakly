import { Activity } from '../models/tracker';
import { LifeData } from '../models/life';
import { dateKey, validDate } from './dates';
import { assertFinance } from './finance';
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const text = (v: unknown, max = 1000): v is string => typeof v === 'string' && v.length <= max;
const named = (v: unknown, max = 120) => text(v, max) && v.trim().length > 0;
const amount = (v: unknown, positive = true) =>
  typeof v === 'number' &&
  Number.isSafeInteger(v) &&
  (positive ? v > 0 : true) &&
  Math.abs(v) <= 1e14;
const past = (v: unknown) => validDate(v) && v <= dateKey();
const url = (v: unknown) => text(v, 2000) && (!v || /^https?:\/\/[^\s]+$/i.test(v));
export function validateLife(raw: unknown, activities: Activity[]): asserts raw is LifeData {
  check(raw && typeof raw === 'object', 'Invalid life-management data.');
  const d = raw as LifeData;
  for (const key of [
    'accounts',
    'transactions',
    'recurring',
    'budgets',
    'savingsGoals',
    'contributions',
    'learning',
    'jobs',
    'goals',
    'journal',
  ] as const) {
    const list = d[key];
    check(Array.isArray(list) && list.length <= 100000, 'Invalid ' + key + ' records.');
    const ids = new Set<string>();
    for (const row of list) {
      check(
        row && named(row.id, 100) && !ids.has(row.id),
        'Invalid or duplicate ' + key + ' identifier.',
      );
      ids.add(row.id);
    }
  }
  check(
    Array.isArray(d.learningCredits) &&
      d.learningCredits.every(
        (c) =>
          c &&
          text(c.activityId, 100) &&
          validDate(c.date) &&
          Number.isFinite(c.baseQuantity) &&
          c.baseQuantity >= 0 &&
          c.baseQuantity <= 1000000 &&
          text(c.baseNote),
      ),
    'Invalid learning streak credits.',
  );
  for (const key of ['incomeCategories', 'expenseCategories'] as const)
    check(
      Array.isArray(d[key]) &&
        d[key].every((c) => named(c, 60)) &&
        new Set(d[key]).size === d[key].length,
      'Invalid financial categories.',
    );
  for (const a of d.accounts)
    check(
      named(a.name) &&
        ['bank', 'cash', 'savings', 'wallet'].includes(a.type) &&
        amount(a.openingBalance, false) &&
        validDate(a.openingDate),
      'Invalid account details.',
    );
  const occurrences = new Set<string>();
  for (const t of d.transactions) {
    check(
      !(t.kind === 'expense' && t.category === 'Savings Transfers'),
      'Savings transfers must be recorded as transfers or allocations, not expenses.',
    );
    if (t.kind === 'income') check(named(t.source), 'Income needs a source.');
    check(
      ['income', 'expense', 'transfer'].includes(t.kind) &&
        amount(t.amount) &&
        past(t.date) &&
        text(t.source, 120) &&
        named(t.category, 60) &&
        text(t.description) &&
        text(t.accountId, 100) &&
        text(t.toAccountId, 100),
      'Invalid transaction.',
    );
    if (t.kind !== 'transfer') check(!t.toAccountId, 'Only transfers have a destination account.');
    if (t.recurringId) {
      const key = t.recurringId + ':' + t.occurrence;
      check(
        d.recurring.some((r) => r.id === t.recurringId) &&
          validDate(t.occurrence) &&
          !occurrences.has(key),
        'Duplicate or invalid recurring transaction.',
      );
      occurrences.add(key);
    }
  }
  for (const r of d.recurring)
    check(
      ['income', 'expense'].includes(r.kind) &&
        !(r.kind === 'expense' && r.category === 'Savings Transfers') &&
        (r.kind !== 'income' || named(r.source)) &&
        amount(r.amount) &&
        validDate(r.startDate) &&
        text(r.source, 120) &&
        named(r.category, 60) &&
        text(r.description) &&
        text(r.accountId, 100) &&
        (!r.accountId ||
          d.accounts.some((a) => a.id === r.accountId && r.startDate >= a.openingDate)) &&
        typeof r.active === 'boolean' &&
        Array.isArray(r.posted) &&
        r.posted.every((p) => past(p) && p >= r.startDate) &&
        new Set(r.posted).size === r.posted.length,
      'Invalid recurring schedule.',
    );
  const budgets = new Set<string>();
  for (const b of d.budgets) {
    const key = b.month + ':' + b.category;
    check(
      /^\d{4}-\d{2}$/.test(b.month) &&
        validDate(b.month + '-01') &&
        text(b.category, 60) &&
        amount(b.amount) &&
        !budgets.has(key),
      'Invalid or duplicate monthly budget.',
    );
    budgets.add(key);
  }
  for (const g of d.savingsGoals)
    check(named(g.name) && amount(g.target) && validDate(g.deadline), 'Invalid savings goal.');
  for (const c of d.contributions)
    check(
      amount(c.amount, false) && c.amount !== 0 && past(c.date) && text(c.note),
      'Invalid savings contribution.',
    );
  for (const e of d.learning)
    check(
      named(e.topic, 200) &&
        text(e.description, 5000) &&
        named(e.category, 60) &&
        Number.isInteger(e.minutes) &&
        e.minutes > 0 &&
        e.minutes <= 1440 &&
        past(e.date) &&
        text(e.resources, 4000) &&
        e.resources
          .split(/\s+/)
          .filter(Boolean)
          .every((link) => url(link)) &&
        text(e.notes, 5000) &&
        text(e.next, 1000) &&
        text(e.activityId, 100) &&
        (!e.activityId || activities.some((a) => a.id === e.activityId && e.date >= a.startDate)),
      'Invalid learning entry or activity link.',
    );
  const credits = new Set<string>();
  for (const c of d.learningCredits) {
    const key = c.activityId + ':' + c.date;
    check(
      activities.some((a) => a.id === c.activityId) &&
        !credits.has(key) &&
        d.learning.some((e) => e.activityId === c.activityId && e.date === c.date),
      'Invalid or duplicate learning credit.',
    );
    credits.add(key);
  }
  for (const j of d.jobs)
    check(
      named(j.company) &&
        named(j.position) &&
        past(j.date) &&
        url(j.link) &&
        ['Applied', 'Interview', 'Rejected', 'Offer'].includes(j.status) &&
        text(j.notes, 5000),
      'Invalid job application.',
    );
  for (const g of d.goals) {
    check(
      named(g.title, 200) &&
        text(g.description, 5000) &&
        named(g.category, 60) &&
        validDate(g.startDate) &&
        validDate(g.deadline) &&
        g.deadline >= g.startDate &&
        ['low', 'medium', 'high'].includes(g.priority) &&
        Number.isFinite(g.progress) &&
        g.progress >= 0 &&
        g.progress <= 100 &&
        ['active', 'completed', 'paused'].includes(g.status) &&
        Array.isArray(g.milestones) &&
        text(g.activityId, 100) &&
        (!g.activityId || activities.some((a) => a.id === g.activityId)) &&
        text(g.savingsId, 100) &&
        (!g.savingsId || d.savingsGoals.some((s) => s.id === g.savingsId)) &&
        text(g.learningCategory, 60) &&
        past(g.updatedOn),
      'Invalid personal goal.',
    );
    const ids = new Set<string>();
    for (const m of g.milestones) {
      check(
        m &&
          named(m.id, 100) &&
          !ids.has(m.id) &&
          named(m.title, 200) &&
          typeof m.done === 'boolean' &&
          (m.done ? past(m.completedOn) : m.completedOn === ''),
        'Invalid milestone.',
      );
      ids.add(m.id);
    }
  }
  const journals = new Set<string>();
  for (const j of d.journal) {
    check(
      past(j.date) &&
        !journals.has(j.date) &&
        [j.accomplished, j.learned, j.challenges, j.ideas, j.improve, j.tomorrow].every((v) =>
          text(v, 5000),
        ) &&
        (j.mood === null || (Number.isInteger(j.mood) && j.mood >= 1 && j.mood <= 5)),
      'Invalid or duplicate journal day.',
    );
    journals.add(j.date);
  }
  check(
    Array.isArray(d.goalEvents) &&
      d.goalEvents.every(
        (e) =>
          e &&
          named(e.id, 100) &&
          d.goals.some((g) => g.id === e.goalId) &&
          past(e.date) &&
          Number.isFinite(e.from) &&
          e.from >= 0 &&
          e.from <= 100 &&
          Number.isFinite(e.to) &&
          e.to >= 0 &&
          e.to <= 100,
      ),
    'Invalid goal progress history.',
  );
  check(
    new Set(d.goalEvents.map((e) => e.id)).size === d.goalEvents.length,
    'Duplicate goal progress event.',
  );
  for (const e of d.learning) {
    if (e.activityId)
      check(
        d.learningCredits.some((c) => c.activityId === e.activityId && c.date === e.date),
        'Linked learning is missing its streak credit.',
      );
  }
  assertFinance(d);
}
