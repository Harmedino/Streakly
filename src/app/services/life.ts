import { computed, inject, Injectable, signal } from '@angular/core';
import { TrackerService } from './tracker';
import {
  Account,
  Budget,
  Goal,
  JobApplication,
  JournalEntry,
  LearningEntry,
  LifeData,
  RecurringTransaction,
  SavingsContribution,
  SavingsGoal,
  Transaction,
  emptyLife,
} from '../models/life';
import { AppData } from '../models/tracker';
import { validateLife } from '../core/life-validation';
import { syncLearning } from '../core/learning';
import { dueRecurring } from '../core/finance';
import { dateKey } from '../core/dates';
export function upsert<T extends { id: string }>(rows: T[], value: T) {
  const index = rows.findIndex((r) => r.id === value.id);
  if (index < 0) rows.push(value);
  else rows[index] = value;
}
export function goalProgress(g: Goal) {
  return g.milestones.length
    ? Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100)
    : g.progress;
}
@Injectable({ providedIn: 'root' })
export class LifeService {
  readonly tracker = inject(TrackerService);
  readonly data = computed(() => this.tracker.data().life ?? emptyLife());
  readonly error = signal('');
  commit(
    change: (life: LifeData, data: AppData) => void,
    message = 'Saved. A little more clarity.',
  ): boolean {
    this.error.set('');
    try {
      const saved = this.tracker.update((d) => {
        d.life ??= emptyLife();
        change(d.life, d);
        validateLife(d.life, d.activities);
      });
      if (saved) this.tracker.notify(message);
      else
        this.error.set(
          this.tracker.storage.error() || 'Your data changed in another tab. Please retry.',
        );
      return saved;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'This record could not be saved.');
      return false;
    }
  }
  saveAccount(a: Account) {
    return this.commit((l) => upsert(l.accounts, a));
  }
  saveTransaction(t: Transaction) {
    return this.commit((l) => {
      if (t.kind === 'expense' && t.category === 'Savings Transfers')
        throw new Error(
          'Use an account transfer or savings contribution. Savings transfers are not spending.',
        );
      upsert(l.transactions, t);
      const categories = t.kind === 'income' ? l.incomeCategories : l.expenseCategories;
      if (t.kind !== 'transfer' && !categories.includes(t.category)) categories.push(t.category);
    });
  }
  saveRecurring(r: RecurringTransaction) {
    return this.commit((l) => {
      upsert(l.recurring, r);
      const categories = r.kind === 'income' ? l.incomeCategories : l.expenseCategories;
      if (!categories.includes(r.category)) categories.push(r.category);
    });
  }
  postRecurring() {
    return this.commit((l) => {
      for (const rule of l.recurring)
        for (const occurrence of dueRecurring(rule)) {
          if (
            l.transactions.some((t) => t.recurringId === rule.id && t.occurrence === occurrence)
          ) {
            if (!rule.posted.includes(occurrence)) rule.posted.push(occurrence);
            continue;
          }
          l.transactions.push({
            id: crypto.randomUUID(),
            kind: rule.kind,
            amount: rule.amount,
            date: occurrence,
            source: rule.source,
            category: rule.category,
            description: rule.description,
            accountId: rule.accountId,
            toAccountId: '',
            recurringId: rule.id,
            occurrence,
          });
          rule.posted.push(occurrence);
        }
    }, 'Due recurring records saved once. Review them in transaction history.');
  }
  saveBudget(b: Budget) {
    return this.commit((l) => {
      const existing = l.budgets.find(
        (x) => x.month === b.month && x.category === b.category && x.id !== b.id,
      );
      if (existing)
        throw new Error(
          'A budget already exists for this month and category. Edit that budget instead.',
        );
      upsert(l.budgets, b);
    });
  }
  saveSavings(g: SavingsGoal) {
    return this.commit((l) => upsert(l.savingsGoals, g));
  }
  contribute(c: SavingsContribution) {
    return this.commit(
      (l) => upsert(l.contributions, c),
      'Savings allocation updated. No income or expense was created.',
    );
  }
  saveLearning(e: LearningEntry) {
    return this.commit((l, d) => {
      const old = l.learning.find((x) => x.id === e.id);
      const pairs = [{ activityId: e.activityId, date: e.date }];
      if (old) pairs.push({ activityId: old.activityId, date: old.date });
      upsert(l.learning, e);
      syncLearning(d, pairs);
    });
  }
  saveJob(j: JobApplication) {
    return this.commit((l) => upsert(l.jobs, j));
  }
  saveGoal(g: Goal) {
    return this.commit((l) => {
      const previous = l.goals.find((x) => x.id === g.id),
        from = previous ? goalProgress(previous) : 0;
      g.progress = goalProgress(g);
      if (g.status === 'completed') {
        g.progress = 100;
        g.milestones = g.milestones.map((m) => ({
          ...m,
          done: true,
          completedOn: m.completedOn || dateKey(),
        }));
      } else if (g.progress === 100) g.status = 'completed';
      g.updatedOn = dateKey();
      upsert(l.goals, g);
      if (from !== g.progress)
        l.goalEvents.push({
          id: crypto.randomUUID(),
          goalId: g.id,
          date: dateKey(),
          from,
          to: g.progress,
        });
    });
  }
  toggleMilestone(g: Goal, id: string) {
    const next = structuredClone(g),
      m = next.milestones.find((m) => m.id === id)!;
    m.done = !m.done;
    m.completedOn = m.done ? dateKey() : '';
    if (!m.done && next.status === 'completed') next.status = 'active';
    return this.saveGoal(next);
  }
  saveJournal(j: JournalEntry) {
    return this.commit((l) => {
      const existing = l.journal.find((e) => e.date === j.date && e.id !== j.id);
      if (existing) throw new Error('This date already has a reflection. Edit that entry.');
      upsert(l.journal, j);
    });
  }
  remove(
    section:
      | 'accounts'
      | 'transactions'
      | 'recurring'
      | 'budgets'
      | 'savingsGoals'
      | 'contributions'
      | 'learning'
      | 'jobs'
      | 'goals'
      | 'journal',
    id: string,
  ) {
    return this.commit((l, d) => {
      if (
        section === 'accounts' &&
        (l.transactions.some((t) => t.accountId === id || t.toAccountId === id) ||
          l.contributions.some((c) => c.accountId === id) ||
          l.recurring.some((r) => r.accountId === id))
      )
        throw new Error(
          'This account has history. Remove or reassign its transactions, savings and recurring schedules first.',
        );
      if (section === 'savingsGoals' && l.contributions.some((c) => c.goalId === id))
        throw new Error(
          'This goal has contribution history. Keep the goal or remove its contributions first.',
        );
      if (section === 'recurring' && l.transactions.some((t) => t.recurringId === id))
        throw new Error('This schedule has posted history. Pause it instead of deleting it.');
      const old = section === 'learning' ? l.learning.find((e) => e.id === id) : null;
      (l[section] as { id: string }[]) = (l[section] as { id: string }[]).filter(
        (e) => e.id !== id,
      );
      if (old) syncLearning(d, [{ activityId: old.activityId, date: old.date }]);
      if (section === 'goals') l.goalEvents = l.goalEvents.filter((e) => e.goalId !== id);
      if (section === 'savingsGoals')
        for (const g of l.goals) if (g.savingsId === id) g.savingsId = '';
    }, 'Record removed.');
  }
}
