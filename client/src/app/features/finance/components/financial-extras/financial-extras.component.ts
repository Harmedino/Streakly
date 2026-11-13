import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinancialTarget, FundingAllocation } from '../../../../core/models/life';
import { LifeService, upsert } from '../../../../core/services/life';
import { money, naira } from '../../../../core/utils/finance';
import { ConfirmDialog, Dialog } from '../../../../shared/components/dialog/index';
import { EmptyState, Progress } from '../../../../shared/components/ui/index';
@Component({
  selector: 'app-financial-extras',
  imports: [FormsModule, Dialog, ConfirmDialog, Progress, EmptyState],
  templateUrl: './financial-extras.component.html',
  styleUrl: './financial-extras.component.scss',
})
export class FinancialExtras {
  life = inject(LifeService);
  view = input('Salary');
  month = input.required<string>();
  selected = signal('');
  Math = Math;
  error = signal('');
  funding = signal(false);
  fundedKey = '';
  parts: { incomeId: string; amount: string }[] = [];
  targetEditor = signal(false);
  deleting = signal<FinancialTarget | null>(null);
  targetId = '';
  targetKind: FinancialTarget['kind'] = 'income';
  targetAmount = '';
  targetMonth = '';
  targetSource = '';
  cash = (n: number) => naira(n, this.life.tracker.data().preferences.currency);
  allIncome = computed(() =>
    this.life
      .data()
      .transactions.filter((t) => t.kind === 'income')
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  incomes = computed(() => this.allIncome().filter((t) => t.date.startsWith(this.month())));
  payment = computed(() => this.incomes().find((t) => t.id === this.selected()));
  allocation = (row: { funding?: FundingAllocation[] }) =>
    (row.funding ?? [])
      .filter((p) => p.incomeId === this.selected())
      .reduce((n, p) => n + p.amount, 0);
  spent = computed(() =>
    this.life
      .data()
      .transactions.filter((t) => t.kind === 'expense')
      .reduce((n, t) => n + this.allocation(t), 0),
  );
  saved = computed(() =>
    this.life.data().contributions.reduce((n, c) => n + this.allocation(c), 0),
  );
  categories = computed(() => {
    const groups = new Map<string, number>();
    for (const t of this.life.data().transactions.filter((t) => t.kind === 'expense')) {
      const amount = this.allocation(t);
      if (amount) groups.set(t.category, (groups.get(t.category) ?? 0) + amount);
    }
    return [...groups]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  });
  eligible = () => [
    ...this.life
      .data()
      .transactions.filter((t) => t.kind === 'expense')
      .map((record) => ({
        key: 'expense:' + record.id,
        label: record.date + ' · ' + (record.description || record.category),
        record,
      })),
    ...this.life.data().contributions.map((record) => ({
      key: 'savings:' + record.id,
      label:
        record.date +
        ' · Savings ' +
        (this.life.data().savingsGoals.find((g) => g.id === record.goalId)?.name ?? ''),
      record,
    })),
  ];
  funded = () => this.eligible().find((r) => r.key === this.fundedKey);
  targets = computed(() =>
    (this.life.data().targets ?? []).filter((t) => t.month === this.month()),
  );
  constructor() {
    effect(() => {
      if (!this.incomes().some((t) => t.id === this.selected()))
        this.selected.set(this.incomes()[0]?.id ?? '');
    });
  }
  openFunding() {
    this.fundedKey = '';
    this.parts = [];
    this.error.set('');
    this.funding.set(true);
  }
  loadParts() {
    this.parts = (this.funded()?.record.funding ?? []).map((p) => ({
      incomeId: p.incomeId,
      amount: String(Math.abs(p.amount) / 100),
    }));
    if (!this.parts.length) this.parts = [{ incomeId: this.selected(), amount: '' }];
    this.error.set('');
  }
  async saveFunding() {
    const row = this.funded();
    if (!row) return;
    try {
      const funding = this.parts.map((p) => ({
        incomeId: p.incomeId,
        amount: money(p.amount) * Math.sign(row.record.amount),
      }));
      const saved = this.life.commit((l) => {
        const target = (row.key.startsWith('expense:') ? l.transactions : l.contributions).find(
          (r) => r.id === row.record.id,
        )!;
        target.funding = funding;
      });
      if (saved && (await this.life.tracker.settled())) this.funding.set(false);
      else this.error.set(this.life.error() || this.life.tracker.api.error());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Check the allocation amounts.');
    }
  }
  actual(t: FinancialTarget) {
    if (t.kind === 'savings')
      return this.life
        .data()
        .contributions.filter((c) => c.date.startsWith(t.month))
        .reduce((n, c) => n + c.amount, 0);
    return this.life
      .data()
      .transactions.filter(
        (r) =>
          r.date.startsWith(t.month) && r.kind === t.kind && (!t.source || r.source === t.source),
      )
      .reduce((n, r) => n + r.amount, 0);
  }
  openTarget(t?: FinancialTarget) {
    this.error.set('');
    this.targetId = t?.id ?? '';
    this.targetKind = t?.kind ?? 'income';
    this.targetAmount = t ? String(t.amount / 100) : '';
    this.targetMonth = t?.month ?? this.month();
    this.targetSource = t?.source ?? '';
    this.targetEditor.set(true);
  }
  async saveTarget() {
    try {
      const t: FinancialTarget = {
        id: this.targetId || crypto.randomUUID(),
        month: this.targetMonth,
        kind: this.targetKind,
        amount: money(this.targetAmount),
        source: this.targetKind === 'income' ? this.targetSource.trim() : '',
      };
      const saved = this.life.commit((l) => {
        l.targets ??= [];
        upsert(l.targets, t);
      });
      if (saved && (await this.life.tracker.settled())) this.targetEditor.set(false);
      else this.error.set(this.life.error() || this.life.tracker.api.error());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Review the target.');
    }
  }
  async deleteTarget(t: FinancialTarget) {
    if (
      this.life.commit((l) => (l.targets = (l.targets ?? []).filter((r) => r.id !== t.id))) &&
      (await this.life.tracker.settled())
    )
      this.deleting.set(null);
  }
}
