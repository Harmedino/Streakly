import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  Account,
  Budget,
  RecurringTransaction,
  SavingsContribution,
  SavingsGoal,
  Transaction,
} from '../../../../core/models/life';
import { LifeService, upsert } from '../../../../core/services/life';
import {
  monthEnd,
  monthShift,
  monthStart,
  prettyDate,
  validDate,
  weekStart,
} from '../../../../core/utils/dates';
import {
  accountBalance,
  csvReport,
  dueRecurring,
  financeTotals,
  groupMoney,
  money,
  monthlyTrend,
  naira,
  reserved,
  savingsProgress,
  signedMoney,
  sum,
} from '../../../../core/utils/finance';
import { ConfirmDialog } from '../../../../shared/components/dialog/index';
import {
  EntryForm,
  FormField,
  FormValues,
} from '../../../../shared/components/entry-form/entry-form.component';
import { Icon } from '../../../../shared/components/icon/icon.component';
import { EmptyState, Progress } from '../../../../shared/components/ui/index';
import { downloadFile } from '../../../../shared/download';
import { FinancialExtras } from '../../components/financial-extras/financial-extras.component';
type Mode =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'account'
  | 'budget'
  | 'savings'
  | 'contribution'
  | 'recurring';
interface Editor {
  mode: Mode;
  id: string;
  title: string;
  fields: FormField[];
  values: FormValues;
  revision: number;
}
const field = (
  key: string,
  label: string,
  type: FormField['type'] = 'text',
  required = true,
  extra: Partial<FormField> = {},
): FormField => ({ key, label, type, required, ...extra });
@Component({
  selector: 'app-finance',
  imports: [FinancialExtras, FormsModule, EntryForm, ConfirmDialog, Icon, EmptyState, Progress],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss',
})
export class Finance {
  life = inject(LifeService);
  tracker = this.life.tracker;
  route = inject(ActivatedRoute);
  tab = signal(this.route.snapshot.queryParamMap.get('tab') || 'Overview');
  tabs = [
    'Overview',
    'Income',
    'Expenses',
    'Budgets',
    'Savings',
    'Accounts',
    'Reports',
    'Salary',
    'Targets',
  ];
  month = signal(this.tracker.today().slice(0, 7));
  search = signal('');
  category = signal('');
  from = signal('');
  to = signal('');
  editor = signal<Editor | null>(null);
  deleting = signal<{
    section: Parameters<LifeService['remove']>[0];
    id: string;
    title: string;
  } | null>(null);
  posting = signal(false);
  categoryIcon(category: string) {
    const icons: Record<string, string> = {
      Food: 'leaf',
      Transportation: 'arrow',
      Education: 'book',
      Health: 'flame',
      Family: 'sprout',
      Rent: 'dashboard',
      Subscriptions: 'calendar',
      Salary: 'briefcase',
      Freelancing: 'briefcase',
      'Data and Airtime': 'chart',
    };
    return icons[category] || 'wallet';
  }
  unit() {
    return this.tracker.data().preferences.currency &&
      this.tracker.data().preferences.currency !== 'NGN'
      ? this.tracker.data().preferences.currency
      : '₦';
  }
  cash = (amount: number) => naira(amount, this.tracker.data().preferences.currency);
  pretty = prettyDate;
  Math = Math;
  sum = sum;
  start = computed(() => this.month() + '-01');
  end = computed(() => {
    const end = monthEnd(this.start());
    return end < this.tracker.today() ? end : this.tracker.today();
  });
  totals = computed(() => financeTotals(this.life.data(), this.start(), this.end()));
  previous = computed(() => {
    const start = monthShift(this.start(), -1);
    return financeTotals(this.life.data(), start, monthEnd(start));
  });
  trend = computed(() => monthlyTrend(this.life.data(), this.month()));
  chartMax = computed(() => Math.max(1, ...this.trend().flatMap((m) => [m.income, m.expenses])));
  monthRecords = computed(() =>
    this.life.data().transactions.filter((t) => t.date >= this.start() && t.date <= this.end()),
  );
  expenses = computed(() => groupMoney(this.monthRecords(), 'expense'));
  sources = computed(() => groupMoney(this.monthRecords(), 'income', 'source'));
  records = computed(() =>
    this.life
      .data()
      .transactions.filter(
        (t) =>
          (this.tab() === 'Income'
            ? t.kind === 'income'
            : this.tab() === 'Expenses'
              ? t.kind === 'expense'
              : true) &&
          t.date >= (this.from() || this.start()) &&
          t.date <= (this.to() || this.end()) &&
          (!this.category() || t.category === this.category()) &&
          (t.description + ' ' + t.source + ' ' + t.category)
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  overall = computed(() =>
    this.life.data().budgets.find((b) => b.month === this.month() && !b.category),
  );
  budgets = computed(() => this.life.data().budgets.filter((b) => b.month === this.month()));
  schedules = computed(() =>
    this.life
      .data()
      .recurring.filter((r) =>
        this.tab() === 'Income' ? r.kind === 'income' : r.kind === 'expense',
      ),
  );
  due = computed(() =>
    this.life
      .data()
      .recurring.flatMap((rule) =>
        dueRecurring(rule, this.tracker.today()).map((date) => ({ rule, date })),
      ),
  );
  highest = computed(() =>
    this.monthRecords()
      .filter((t) => t.kind === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
  );
  recent = computed(() =>
    this.monthRecords()
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6),
  );
  periodTotals = computed(() => {
    const now = this.tracker.today(),
      d = this.life.data();
    return [
      { label: 'Today', ...financeTotals(d, now, now) },
      { label: 'This week', ...financeTotals(d, weekStart(now), now) },
      { label: 'This month', ...financeTotals(d, monthStart(now), now) },
      { label: 'This year', ...financeTotals(d, now.slice(0, 4) + '-01-01', now) },
    ];
  });
  isRecurringExpense = (t: Transaction) => t.kind === 'expense' && !!t.recurringId;
  transactionAmount = (t: Transaction) => t.amount;
  isTransfer = (t: Transaction) => t.kind === 'transfer';
  dueDescription() {
    return this.due()
      .map(
        (d) => d.date + ' ' + (d.rule.source || d.rule.category) + ' ' + this.cash(d.rule.amount),
      )
      .join('; ');
  }
  constructor() {
    const action = this.route.snapshot.queryParamMap.get('action');
    if (['income', 'expense', 'transfer'].includes(action ?? '')) this.open(action as Mode);
  }
  changeMonth(value: string) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value) && validDate(value + '-01')) this.month.set(value);
  }
  accountName(id: string) {
    return this.life.data().accounts.find((a) => a.id === id)?.name || 'Unassigned';
  }
  balance(a: Account) {
    return accountBalance(this.life.data(), a, this.end());
  }
  held(a: Account) {
    return reserved(this.life.data(), a.id, this.end());
  }
  saved(id: string) {
    return savingsProgress(this.life.data(), id, this.end());
  }
  used(b: Budget) {
    return sum(
      this.monthRecords()
        .filter((t) => t.kind === 'expense' && (!b.category || t.category === b.category))
        .map((t) => t.amount),
    );
  }
  percent(value: number, target: number) {
    return target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  }
  export() {
    downloadFile(
      csvReport(
        this.records(),
        this.life.data().accounts,
        this.tracker.data().preferences.currency,
      ),
      'streakly-finance-' + this.month() + '.csv',
      'text/csv;charset=utf-8',
    );
  }
  open(
    mode: Mode,
    record?:
      Account | Transaction | Budget | SavingsGoal | SavingsContribution | RecurringTransaction,
    goalId = '',
  ) {
    this.life.error.set('');
    const r = record as unknown as FormValues | undefined;
    const values: FormValues = {};
    if (r)
      for (const [key, value] of Object.entries(r))
        if (['string', 'number', 'boolean'].includes(typeof value)) values[key] = value;
    const accounts = [
      { value: '', label: 'Unassigned · excluded from account balances' },
      ...this.life.data().accounts.map((a) => ({ value: a.id, label: a.name })),
    ];
    const base = mode === 'income' || mode === 'expense';
    let fields: FormField[] = [];
    if (base || mode === 'transfer' || mode === 'recurring') {
      values['amount'] = r ? Number(r['amount']) / 100 : '';
      values['date'] ??= this.tracker.today();
      values['category'] ??= mode === 'income' ? 'Salary' : 'Food';
      values['accountId'] ??= '';
      values['toAccountId'] ??= '';
      fields = [
        field('amount', 'Amount (' + this.unit() + ')', 'number', true, {
          min: 0.01,
          step: '0.01',
        }),
        field(
          mode === 'recurring' ? 'startDate' : 'date',
          mode === 'recurring' ? 'First monthly due date' : 'Transaction date',
          'date',
          true,
          mode === 'recurring' ? {} : { max: this.tracker.today() },
        ),
      ];
      if (mode === 'recurring') {
        values['kind'] ??= this.tab() === 'Income' ? 'income' : 'expense';
        values['startDate'] ??= this.tracker.today();
        values['active'] ??= true;
        fields.push(
          field('kind', 'Record type', 'select', true, {
            options: [
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
            ],
          }),
        );
      }
      if (mode !== 'transfer') {
        fields.push(
          field(
            'source',
            mode === 'income' ? 'Income source' : 'Source / merchant',
            'text',
            mode === 'income',
          ),
          field('category', 'Category', 'text', true, {
            maxLength: 60,
            hint:
              'Use an existing category or type your own. ' +
              (mode === 'income'
                ? this.life.data().incomeCategories
                : this.life.data().expenseCategories
              ).join(' · '),
          }),
        );
      }
      fields.push(
        field(
          'accountId',
          mode === 'transfer' ? 'From account' : 'Payment account',
          'select',
          mode === 'transfer',
          { options: mode === 'transfer' ? accounts.slice(1) : accounts },
        ),
      );
      if (mode === 'transfer')
        fields.push(
          field('toAccountId', 'To account', 'select', true, { options: accounts.slice(1) }),
        );
      fields.push(
        field('description', 'Description / notes', 'textarea', false, { maxLength: 1000 }),
      );
      if (base && !record)
        fields.push(
          field('recurring', 'Repeat monthly after this record', 'checkbox', false, {
            hint: 'Future occurrences are only recorded when you review and confirm due records.',
          }),
        );
      if (mode === 'recurring')
        fields.push(field('active', 'Active monthly schedule', 'checkbox', false));
    }
    if (mode === 'account') {
      values['openingBalance'] = r ? Number(r['openingBalance']) / 100 : 0;
      values['openingDate'] ??= monthStart(this.tracker.today());
      values['type'] ??= 'bank';
      fields = [
        field('name', 'Account name'),
        field('type', 'Account type', 'select', true, {
          options: [
            { value: 'bank', label: 'Bank account' },
            { value: 'cash', label: 'Cash' },
            { value: 'savings', label: 'Savings account' },
            { value: 'wallet', label: 'Mobile wallet' },
          ],
        }),
        field('openingBalance', 'Opening balance (' + this.unit() + ')', 'number', true, {
          step: '0.01',
          hint: 'Actual balance before the transactions you will record. No banking credentials.',
        }),
        field('openingDate', 'Opening balance date', 'date', true, { max: this.tracker.today() }),
      ];
    }
    if (mode === 'budget') {
      values['month'] ??= this.month();
      values['category'] ??= '';
      values['amount'] = r ? Number(r['amount']) / 100 : '';
      fields = [
        field('month', 'Budget month', 'month'),
        field('category', 'Category · leave blank for overall budget', 'text', false, {
          maxLength: 60,
        }),
        field('amount', 'Monthly budget (' + this.unit() + ')', 'number', true, {
          min: 0.01,
          step: '.01',
        }),
      ];
    }
    if (mode === 'savings') {
      values['target'] = r ? Number(r['target']) / 100 : '';
      fields = [
        field('name', 'Savings goal name'),
        field('target', 'Target amount (' + this.unit() + ')', 'number', true, {
          min: 0.01,
          step: '.01',
        }),
        field('deadline', 'Target date', 'date', false),
      ];
    }
    if (mode === 'contribution') {
      values['goalId'] ??= goalId;
      values['amount'] = r ? Math.abs(Number(r['amount'])) / 100 : '';
      values['direction'] = r && Number(r['amount']) < 0 ? 'withdraw' : 'add';
      values['date'] ??= this.tracker.today();
      values['accountId'] ??= this.life.data().accounts[0]?.id ?? '';
      fields = [
        field('goalId', 'Savings goal', 'select', true, {
          options: this.life.data().savingsGoals.map((g) => ({ value: g.id, label: g.name })),
        }),
        field('direction', 'Allocation type', 'select', true, {
          options: [
            { value: 'add', label: 'Add to savings' },
            { value: 'withdraw', label: 'Withdraw / release savings' },
          ],
        }),
        field('amount', 'Amount (' + this.unit() + ')', 'number', true, { min: 0.01, step: '.01' }),
        field('accountId', 'Account holding the money', 'select', true, {
          options: accounts.slice(1),
        }),
        field('date', 'Contribution date', 'date', true, { max: this.tracker.today() }),
        field('note', 'Note', 'textarea', false, {
          maxLength: 1000,
          hint: 'This earmarks existing funds; it does not move money or create income/expenses. Use Accounts to physically transfer funds.',
        }),
      ];
    }
    if (['income', 'expense', 'account', 'savings', 'budget'].includes(mode)) {
      const basics: Record<string, string[]> = {
        income: ['amount', 'source'],
        expense: ['amount', 'category', 'description'],
        account: ['name', 'openingBalance'],
        savings: ['name', 'target'],
        budget: ['amount', 'category'],
      };
      fields = fields.map((f) => ({
        ...f,
        advanced: !basics[mode].includes(f.key),
        required: basics[mode].includes(f.key) ? f.required : false,
      }));
    }
    this.editor.set({
      mode,
      id: String(r?.['id'] ?? crypto.randomUUID()),
      title:
        (record ? 'Edit ' : 'Add ') +
        {
          income: 'income',
          expense: 'expense',
          transfer: 'account transfer',
          account: 'account',
          budget: 'budget',
          savings: 'savings goal',
          contribution: 'savings contribution',
          recurring: 'monthly schedule',
        }[mode],
      fields,
      values,
      revision: this.tracker.data().revision ?? 0,
    });
  }
  async save(v: FormValues) {
    const e = this.editor()!;
    if ((this.tracker.data().revision ?? 0) !== e.revision) {
      this.life.error.set('Data changed while this form was open. Close and reopen it.');
      return;
    }
    const str = (k: string) => String(v[k] ?? '').trim();
    try {
      let saved = false;
      const mode = e.mode;
      if (mode === 'account')
        saved = this.life.saveAccount({
          id: e.id,
          name: str('name'),
          type: str('type') as Account['type'],
          openingBalance: signedMoney(str('openingBalance')),
          openingDate: str('openingDate'),
        });
      if (mode === 'budget')
        saved = this.life.saveBudget({
          id: e.id,
          month: str('month'),
          category: str('category'),
          amount: money(str('amount')),
        });
      if (mode === 'savings')
        saved = this.life.saveSavings({
          id: e.id,
          name: str('name'),
          target: money(str('target')),
          deadline: str('deadline'),
        });
      if (mode === 'contribution')
        saved = this.life.contribute({
          id: e.id,
          goalId: str('goalId'),
          accountId: str('accountId'),
          date: str('date'),
          amount: money(str('amount')) * (str('direction') === 'withdraw' ? -1 : 1),
          note: str('note'),
          funding: this.life.data().contributions.find((c) => c.id === e.id)?.funding,
        });
      if (mode === 'recurring') {
        const old = this.life.data().recurring.find((r) => r.id === e.id);
        saved = this.life.saveRecurring({
          id: e.id,
          kind: str('kind') as 'income' | 'expense',
          amount: money(str('amount')),
          startDate: str('startDate'),
          source: str('source'),
          category: str('category'),
          description: str('description'),
          accountId: str('accountId'),
          active: !!v['active'],
          posted: old?.posted ?? [],
        });
      }
      if (mode === 'income' || mode === 'expense' || mode === 'transfer') {
        const old = this.life.data().transactions.find((t) => t.id === e.id);
        const t: Transaction = {
          id: e.id,
          kind: mode,
          amount: money(str('amount')),
          date: str('date'),
          source: str('source'),
          category: mode === 'transfer' ? 'Transfer' : str('category'),
          description: str('description'),
          accountId: str('accountId'),
          toAccountId: mode === 'transfer' ? str('toAccountId') : '',
          ...(old?.funding ? { funding: old.funding } : {}),
          ...(old?.recurringId ? { recurringId: old.recurringId, occurrence: old.occurrence } : {}),
        };
        if (mode !== 'transfer' && v['recurring']) {
          saved = this.life.commit((l) => {
            if (t.kind === 'expense' && t.category === 'Savings Transfers')
              throw new Error('Use transfers or savings allocations for savings.');
            const id = crypto.randomUUID();
            l.recurring.push({
              id,
              kind: mode,
              amount: t.amount,
              startDate: t.date,
              source: t.source,
              category: t.category,
              description: t.description,
              accountId: t.accountId,
              active: true,
              posted: [t.date],
            });
            t.recurringId = id;
            t.occurrence = t.date;
            upsert(l.transactions, t);
            const cats = mode === 'income' ? l.incomeCategories : l.expenseCategories;
            if (!cats.includes(t.category)) cats.push(t.category);
          });
        } else saved = this.life.saveTransaction(t);
      }
      if (saved && (await this.tracker.settled())) this.editor.set(null);
    } catch (error) {
      this.life.error.set(error instanceof Error ? error.message : 'Check the entered values.');
    }
  }
  ask(section: Parameters<LifeService['remove']>[0], id: string, title: string) {
    this.deleting.set({ section, id, title });
  }
  async remove() {
    const d = this.deleting()!;
    if (this.life.remove(d.section, d.id) && (await this.tracker.settled()))
      this.deleting.set(null);
  }
  async post() {
    if (this.life.postRecurring() && (await this.tracker.settled())) this.posting.set(false);
  }
  toggleSchedule(r: RecurringTransaction) {
    this.life.saveRecurring({ ...r, active: !r.active });
  }
}
