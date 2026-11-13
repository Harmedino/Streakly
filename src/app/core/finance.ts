import { Account, LifeData, Transaction, RecurringTransaction } from '../models/life';
import { dateKey, datesBetween, monthEnd, monthShift, parseDate, validDate } from './dates';
export function money(value: string | number): number {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error('Enter a positive amount with at most two decimal places.');
  const [whole, decimal = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 1e14)
    throw new Error('Enter an amount between ₦0.01 and ₦1 trillion.');
  return result;
}
export function signedMoney(value: string | number): number {
  const text = String(value).trim();
  return text === '0' || text === '0.00'
    ? 0
    : text.startsWith('-')
      ? -money(text.slice(1))
      : money(text);
}
export function naira(kobo: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}
export function sum(values: number[]): number {
  const total = values.reduce((n, v) => n + v, 0);
  if (!Number.isSafeInteger(total))
    throw new Error('The combined amount is too large to calculate safely.');
  return total;
}
export function accountBalance(life: LifeData, account: Account, through = dateKey()): number {
  if (account.openingDate > through) return 0;
  return sum([
    account.openingBalance,
    ...life.transactions
      .filter((t) => t.date >= account.openingDate && t.date <= through)
      .map(
        (t) =>
          (t.kind === 'income' && t.accountId === account.id ? t.amount : 0) -
          (t.kind === 'expense' && t.accountId === account.id ? t.amount : 0) +
          (t.kind === 'transfer' && t.toAccountId === account.id ? t.amount : 0) -
          (t.kind === 'transfer' && t.accountId === account.id ? t.amount : 0),
      ),
  ]);
}
export function reserved(life: LifeData, accountId: string, through = dateKey()): number {
  return sum(
    life.contributions
      .filter((c) => c.accountId === accountId && c.date <= through)
      .map((c) => c.amount),
  );
}
export function savingsProgress(life: LifeData, goalId: string, through = dateKey()): number {
  return sum(
    life.contributions.filter((c) => c.goalId === goalId && c.date <= through).map((c) => c.amount),
  );
}
export function financeTotals(life: LifeData, start: string, end: string) {
  const records = life.transactions.filter((t) => t.date >= start && t.date <= end);
  const income = sum(records.filter((t) => t.kind === 'income').map((t) => t.amount)),
    expenses = sum(records.filter((t) => t.kind === 'expense').map((t) => t.amount));
  const balances = life.accounts.map((a) => ({
    account: a,
    balance: accountBalance(life, a, end),
    reserved: reserved(life, a.id, end),
  }));
  const balance = sum(balances.map((a) => a.balance));
  const savings = sum(balances.map((a) => (a.account.type === 'savings' ? a.balance : a.reserved)));
  const available = sum(
    balances.filter((a) => a.account.type !== 'savings').map((a) => a.balance - a.reserved),
  );
  return {
    income,
    expenses,
    net: income - expenses,
    balance,
    savings,
    available,
    balances,
    unassigned: records.filter((t) => t.kind !== 'transfer' && !t.accountId).length,
    savedInPeriod: sum(
      life.contributions.filter((c) => c.date >= start && c.date <= end).map((c) => c.amount),
    ),
  };
}
export function groupMoney(
  records: Transaction[],
  kind: 'income' | 'expense',
  by: 'category' | 'source' = 'category',
) {
  const groups = new Map<string, number>();
  for (const t of records.filter((t) => t.kind === kind))
    groups.set(t[by] || 'Unspecified', (groups.get(t[by] || 'Unspecified') ?? 0) + t.amount);
  return [...groups]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}
export function monthlyTrend(life: LifeData, month: string, count = 6) {
  return Array.from({ length: count }, (_, i) => {
    const date = monthShift(month + '-01', i - count + 1);
    return { month: date.slice(0, 7), ...financeTotals(life, date, monthEnd(date)) };
  });
}
export function dueRecurring(rule: RecurringTransaction, through = dateKey()): string[] {
  if (!rule.active) return [];
  const dates: string[] = [];
  let month = rule.startDate.slice(0, 7) + '-01';
  const day = parseDate(rule.startDate).getDate();
  while (month <= through) {
    const date =
      month.slice(0, 7) +
      '-' +
      String(Math.min(day, parseDate(monthEnd(month)).getDate())).padStart(2, '0');
    if (date >= rule.startDate && date <= through && !rule.posted.includes(date)) dates.push(date);
    month = monthShift(month, 1);
  }
  return dates;
}
export function assertFinance(life: LifeData): void {
  const accounts = new Map(life.accounts.map((a) => [a.id, a]));
  for (const t of life.transactions) {
    if (t.accountId && !accounts.has(t.accountId))
      throw new Error('A transaction references an unknown account.');
    if (
      t.kind === 'transfer' &&
      (!t.accountId ||
        !t.toAccountId ||
        t.accountId === t.toAccountId ||
        !accounts.has(t.toAccountId))
    )
      throw new Error('Choose two different accounts for a transfer.');
    for (const id of [t.accountId, t.toAccountId].filter(Boolean)) {
      if (t.date < accounts.get(id)!.openingDate)
        throw new Error('Transactions cannot precede the account opening date.');
    }
  }
  for (const c of life.contributions) {
    if (!accounts.has(c.accountId) || !life.savingsGoals.some((g) => g.id === c.goalId))
      throw new Error('A savings contribution references a missing goal or account.');
    if (c.date < accounts.get(c.accountId)!.openingDate)
      throw new Error('Contributions cannot precede the account opening date.');
  }
  // Check every ledger event date, so backdating/editing/deletion cannot create negative allocations.
  for (const date of [
    ...new Set(life.contributions.map((c) => c.date).concat(life.transactions.map((t) => t.date))),
  ].sort()) {
    for (const a of life.accounts) {
      const held = reserved(life, a.id, date);
      if (held < 0) throw new Error('Savings withdrawals cannot exceed saved contributions.');
      if (held > 0 && accountBalance(life, a, date) < held)
        throw new Error(
          'This change would spend money reserved for savings. Withdraw or reassign those savings first.',
        );
    }
    for (const g of life.savingsGoals)
      for (const a of life.accounts) {
        if (
          sum(
            life.contributions
              .filter((c) => c.goalId === g.id && c.accountId === a.id && c.date <= date)
              .map((c) => c.amount),
          ) < 0
        )
          throw new Error('Withdraw only from the account holding this goal’s savings.');
      }
  }
}
export function csvReport(
  transactions: Transaction[],
  accounts: Account[],
  currency = 'NGN',
): string {
  const cell = (v: string) =>
    '"' + (/^[=+@\-\t\r]/.test(v) ? "'" + v : v).replace(/"/g, '""') + '"';
  return [
    [
      'Date',
      'Type',
      'Amount (' + currency + ')',
      'Source',
      'Category',
      'Account',
      'Destination',
      'Description',
    ],
    ...transactions.map((t) => [
      t.date,
      t.kind,
      (t.amount / 100).toFixed(2),
      t.source,
      t.category,
      accounts.find((a) => a.id === t.accountId)?.name ?? 'Unassigned',
      accounts.find((a) => a.id === t.toAccountId)?.name ?? '',
      t.description,
    ]),
  ]
    .map((row) => row.map(cell).join(','))
    .join('\r\n');
}
