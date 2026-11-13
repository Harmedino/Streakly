import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LifeService, upsert } from '../../services/life';
import {
  FinancialTarget,
  FundingAllocation,
  Transaction,
  SavingsContribution,
} from '../../models/life';
import { money, naira } from '../../core/finance';
import { Dialog, ConfirmDialog } from '../../shared/dialog';
import { Progress, EmptyState } from '../../shared/ui';
@Component({
  selector: 'app-financial-extras',
  imports: [FormsModule, Dialog, ConfirmDialog, Progress, EmptyState],
  template: `
    @if (view() === 'Salary') {
      <div class="section-heading module-heading">
        <div>
          <span class="eyebrow">REAL PAYMENT RELATIONSHIPS</span>
          <h2>Salary & income funding</h2>
          <p>
            Choose a payment to see only the spending and savings explicitly linked to it.
            Unassigned expenses are never assumed to come from salary.
          </p>
        </div>
      </div>
      <label
        >Income payment<select [ngModel]="selected()" (ngModelChange)="selected.set($event)">
          <option value="">Choose a payment</option>
          @for (t of incomes(); track t.id) {
            <option [value]="t.id">{{ t.date }} · {{ t.source }} · {{ cash(t.amount) }}</option>
          }
        </select></label
      >
      @if (payment(); as p) {
        <div class="life-stats">
          <div>
            <span>Payment received</span><strong>{{ cash(p.amount) }}</strong
            ><small>{{ p.source }}</small>
          </div>
          <div>
            <span>Linked spending</span><strong>{{ cash(spent()) }}</strong
            ><small>Explicit expense allocations</small>
          </div>
          <div>
            <span>Linked savings</span><strong>{{ cash(saved()) }}</strong
            ><small>Allocations minus withdrawals</small>
          </div>
          <div>
            <span>Payment remaining</span><strong>{{ cash(p.amount - spent() - saved()) }}</strong
            ><small>Unallocated part of this payment</small>
          </div>
        </div>
        <app-progress [value]="Math.min(100, ((spent() + saved()) / p.amount) * 100)" />
        <p class="helper">
          {{ Math.round(((spent() + saved()) / p.amount) * 100) }}% allocated. This funding view
          does not change account balances.
        </p>
        <button class="btn primary" (click)="openFunding()">Link spending or savings</button>
        <section class="panel spaced-panel allocation-history">
          <h2>Spending by category</h2>
          @for (group of categories(); track group.name) {
            <div class="distribution-row">
              <div>
                <span>{{ group.name }}</span
                ><strong>{{ cash(group.amount) }}</strong>
              </div>
              <app-progress [value]="spent() ? (group.amount / spent()) * 100 : 0" />
            </div>
          } @empty {
            <p class="helper">No expenses are linked to this payment yet.</p>
          }
        </section>
      }
      <section class="panel spaced-panel">
        <h2>Payment history</h2>
        @for (t of incomes(); track t.id) {
          <button class="funding-history" (click)="selected.set(t.id)">
            <span
              >{{ t.source }}<small>{{ t.date }} · {{ t.category }}</small></span
            ><strong>{{ cash(t.amount) }}</strong>
          </button>
        } @empty {
          <app-empty
            title="Your salary has a story."
            description="Record income first. Then link the spending and savings you want to attribute to that payment."
          />
        }
      </section>
      @if (funding()) {
        <app-dialog title="Allocate funding" (close)="funding.set(false)"
          ><p class="helper">
            Choose an existing expense or savings contribution, then split its funding across
            recorded income payments. Allocations cannot exceed the record or reuse money already
            allocated elsewhere.
          </p>
          <label
            >Record to fund<select
              aria-label="Record to fund"
              [(ngModel)]="fundedKey"
              (ngModelChange)="loadParts()"
            >
              <option value="">Choose a record</option>
              @for (row of eligible(); track row.key) {
                <option [value]="row.key">{{ row.label }} · {{ cash(row.record.amount) }}</option>
              }
            </select></label
          >
          @if (funded()) {
            <div class="funding-parts">
              @for (part of parts; track $index) {
                <div>
                  <label
                    >Income source<select aria-label="Income source" [(ngModel)]="part.incomeId">
                      <option value="">Choose a payment</option>
                      @for (t of allIncome(); track t.id) {
                        <option [value]="t.id">
                          {{ t.source }} · {{ t.date }} · {{ cash(t.amount) }}
                        </option>
                      }
                    </select></label
                  ><label
                    >Amount<input
                      type="number"
                      [(ngModel)]="part.amount"
                      min="0.01"
                      step="0.01" /></label
                  ><button
                    class="icon-button"
                    aria-label="Remove funding split"
                    (click)="parts.splice($index, 1)"
                  >
                    ×
                  </button>
                </div>
              }
            </div>
            <button
              class="text-button"
              (click)="parts.push({ incomeId: '', amount: '' })"
              [disabled]="parts.length >= 50"
            >
              + Add another funding source
            </button>
            <p class="helper">
              Leave part of the amount unallocated if its source is unknown. Remove all splits to
              unlink funding. Withdrawals release their linked income allocation.
            </p>
          }
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <div class="form-actions">
            <button class="btn" (click)="funding.set(false)">Cancel</button
            ><button
              class="btn primary"
              [disabled]="!funded() || life.tracker.api.busy()"
              (click)="saveFunding()"
            >
              Save allocations
            </button>
          </div></app-dialog
        >
      }
    }
    @if (view() === 'Targets') {
      <div class="section-heading module-heading">
        <div>
          <span class="eyebrow">A PLAN FOR YOUR MONEY</span>
          <h2>Monthly targets</h2>
          <p>
            Track income, spending limits and net savings contributions. Category spending limits
            remain in Budgets.
          </p>
        </div>
        <button class="btn primary" (click)="openTarget()">Add target</button>
      </div>
      <div class="module-grid">
        @for (t of targets(); track t.id) {
          <section class="panel spaced-panel">
            <span class="eyebrow">{{ t.kind }} · {{ t.source || 'All sources' }}</span>
            <h2>
              {{ cash(actual(t)) }} <span class="muted small">/ {{ cash(t.amount) }}</span>
            </h2>
            <app-progress [value]="Math.max(0, Math.min(100, (actual(t) / t.amount) * 100))" />
            <p class="helper">
              {{ Math.round((actual(t) / t.amount) * 100) }}% ·
              {{ cash(Math.abs(t.amount - actual(t))) }}
              {{
                actual(t) > t.amount
                  ? t.kind === 'expense'
                    ? 'over your limit'
                    : 'above target'
                  : t.kind === 'expense'
                    ? 'remaining before the limit'
                    : 'still to go'
              }}
            </p>
            <div class="quick-actions">
              <button class="text-button" (click)="openTarget(t)">Edit target</button
              ><button class="text-button destructive" (click)="deleting.set(t)">
                Delete target
              </button>
            </div>
          </section>
        } @empty {
          <app-empty
            title="Give this month a direction."
            description="Choose an income goal, an expense ceiling or a savings target. Progress uses actual saved records."
          />
        }
      </div>
      @if (targetEditor()) {
        <app-dialog
          [title]="targetId ? 'Edit target' : 'New monthly target'"
          (close)="targetEditor.set(false)"
          ><form (ngSubmit)="saveTarget()" #form="ngForm">
            <label
              >Target type<select name="kind" [(ngModel)]="targetKind">
                <option value="income">Earn at least</option>
                <option value="expense">Spend no more than</option>
                <option value="savings">Save at least</option>
              </select></label
            ><label
              >Amount<input
                type="number"
                name="amount"
                [(ngModel)]="targetAmount"
                min="0.01"
                step="0.01"
                required
            /></label>
            <details>
              <summary>More Options</summary>
              <label
                >Month<input type="month" name="month" [(ngModel)]="targetMonth" required
              /></label>
              @if (targetKind === 'income') {
                <label
                  >Income source · optional<input
                    name="source"
                    [(ngModel)]="targetSource"
                    maxlength="120"
                    placeholder="Leave blank for all income"
                /></label>
              }
            </details>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <div class="form-actions">
              <button type="button" class="btn" (click)="targetEditor.set(false)">Cancel</button
              ><button class="btn primary" [disabled]="form.invalid || life.tracker.api.busy()">
                Save target
              </button>
            </div>
          </form></app-dialog
        >
      }
      @if (deleting(); as t) {
        <app-confirm
          title="Delete this target?"
          message="Recorded transactions and savings history will stay intact."
          label="Delete target"
          (cancel)="deleting.set(null)"
          (confirm)="deleteTarget(t)"
        />
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .allocation-history {
      margin-top: 24px;
    }
    .funding-history {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: center;
      width: 100%;
      padding: 16px 0;
      background: none;
      text-align: left;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
    }
    .funding-history small {
      display: block;
      color: var(--muted);
      font-size: 11px;
      margin-top: 5px;
    }
    .funding-parts > div {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 120px 32px;
      gap: 10px;
      align-items: center;
    }
    .funding-parts label {
      min-width: 0;
    }
    @media (max-width: 600px) {
      .funding-parts > div {
        grid-template-columns: minmax(0, 1fr) 36px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--line);
        margin-bottom: 14px;
      }
      .funding-parts label {
        grid-column: 1;
      }
      .funding-parts .icon-button {
        grid-column: 2;
        grid-row: 1/3;
      }
      .life-stats strong {
        font-size: 22px;
      }
    }
  `,
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
