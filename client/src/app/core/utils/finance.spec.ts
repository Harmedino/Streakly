import { describe, expect, it } from 'vitest';
import { Account, RecurringTransaction, Transaction, emptyLife } from '../models/life';
import {
  accountBalance,
  assertFinance,
  csvReport,
  dueRecurring,
  financeTotals,
  money,
  signedMoney,
} from './finance';
const account = (id: string, balance: string, type: Account['type'] = 'bank'): Account => ({
  id,
  name: id,
  type,
  openingBalance: money(balance),
  openingDate: '2026-01-01',
});
const transaction = (
  id: string,
  kind: Transaction['kind'],
  amount: string,
  accountId: string,
  toAccountId = '',
): Transaction => ({
  id,
  kind,
  amount: money(amount),
  accountId,
  toAccountId,
  date: '2026-01-10',
  source: 'Work',
  category: kind === 'transfer' ? 'Transfer' : 'Other',
  description: '',
});
describe('Exact money and account balances', () => {
  it('uses integer kobo and rejects imprecise or invalid values', () => {
    expect(money('0.10') + money('0.20')).toBe(money('0.30'));
    expect(signedMoney('-42.15')).toBe(-4215);
    expect(signedMoney('0')).toBe(0);
    for (const value of ['0', '-10', '1.001', 'Infinity', 'NaN', '1e8'])
      expect(() => money(value)).toThrow();
  });
  it('keeps income, spending, transfers and savings allocations distinct', () => {
    const d = emptyLife();
    d.accounts = [
      account('Bank', '100000'),
      account('Cash', '5000', 'cash'),
      account('Savings', '10000', 'savings'),
    ];
    d.transactions = [
      transaction('salary', 'income', '50000', 'Bank'),
      transaction('food', 'expense', '10000', 'Bank'),
      transaction('move', 'transfer', '20000', 'Bank', 'Savings'),
    ];
    d.savingsGoals = [
      { id: 'laptop', name: 'Laptop', target: money('50000'), deadline: '2026-12-01' },
    ];
    d.contributions = [
      {
        id: 'save',
        goalId: 'laptop',
        accountId: 'Bank',
        amount: money('15000'),
        date: '2026-01-11',
        note: '',
      },
    ];
    assertFinance(d);
    expect(accountBalance(d, d.accounts[0], '2026-01-31')).toBe(money('120000'));
    expect(financeTotals(d, '2026-01-01', '2026-01-31')).toMatchObject({
      income: money('50000'),
      expenses: money('10000'),
      net: money('40000'),
      balance: money('155000'),
      available: money('110000'),
      savings: money('45000'),
    });
    d.contributions.push({
      id: 'withdraw',
      goalId: 'laptop',
      accountId: 'Bank',
      amount: -money('5000'),
      date: '2026-01-12',
      note: '',
    });
    assertFinance(d);
    expect(financeTotals(d, '2026-01-01', '2026-01-31')).toMatchObject({
      available: money('115000'),
      savings: money('40000'),
      income: money('50000'),
      expenses: money('10000'),
    });
  });
  it('does not double count money earmarked inside an existing savings account', () => {
    const d = emptyLife();
    d.accounts = [account('Savings', '10000', 'savings')];
    d.savingsGoals = [
      { id: 'g', name: 'Emergency', target: money('20000'), deadline: '2026-12-31' },
    ];
    d.contributions = [
      {
        id: 'c',
        goalId: 'g',
        accountId: 'Savings',
        amount: money('5000'),
        date: '2026-01-02',
        note: '',
      },
    ];
    expect(financeTotals(d, '2026-01-01', '2026-01-31')).toMatchObject({
      balance: money('10000'),
      savings: money('10000'),
      available: 0,
    });
  });
  it('includes unassigned income in cash flow but not tracked balances', () => {
    const d = emptyLife();
    d.accounts = [account('Bank', '100')];
    d.transactions = [transaction('gift', 'income', '50', '')];
    expect(financeTotals(d, '2026-01-01', '2026-01-31')).toMatchObject({
      income: money('50'),
      balance: money('100'),
      available: money('100'),
      unassigned: 1,
    });
  });
  it('rejects transfers to the same account and transactions before an opening balance', () => {
    const d = emptyLife();
    d.accounts = [account('Bank', '100')];
    d.transactions = [transaction('bad', 'transfer', '10', 'Bank', 'Bank')];
    expect(() => assertFinance(d)).toThrow('different');
    d.transactions = [{ ...transaction('old', 'expense', '10', 'Bank'), date: '2025-12-31' }];
    expect(() => assertFinance(d)).toThrow('opening');
  });
  it('rejects withdrawals beyond a goal allocation and edits that spend reserved funds', () => {
    const d = emptyLife();
    d.accounts = [account('Bank', '100')];
    d.savingsGoals = [{ id: 'g', name: 'Goal', target: money('100'), deadline: '2026-12-01' }];
    d.contributions = [
      {
        id: 'c',
        goalId: 'g',
        accountId: 'Bank',
        amount: -money('1'),
        date: '2026-01-02',
        note: '',
      },
    ];
    expect(() => assertFinance(d)).toThrow('withdraw');
    d.contributions[0].amount = money('80');
    d.transactions = [transaction('spend', 'expense', '50', 'Bank')];
    expect(() => assertFinance(d)).toThrow('reserved');
  });
});
describe('Recurring records and CSV', () => {
  it('keeps a 31st-day anchor through short and leap months', () => {
    const r: RecurringTransaction = {
      id: 'r',
      kind: 'expense',
      amount: 100,
      startDate: '2024-01-31',
      source: 'Internet',
      category: 'Subscriptions',
      description: '',
      accountId: '',
      active: true,
      posted: [],
    };
    expect(dueRecurring(r, '2024-03-31')).toEqual(['2024-01-31', '2024-02-29', '2024-03-31']);
    r.posted = ['2024-01-31', '2024-02-29'];
    expect(dueRecurring(r, '2024-03-31')).toEqual(['2024-03-31']);
    r.active = false;
    expect(dueRecurring(r, '2024-12-31')).toEqual([]);
  });
  it('escapes commas, quotes, line breaks and spreadsheet formulas', () => {
    const csv = csvReport(
      [
        {
          ...transaction('t', 'income', '12.34', 'Bank'),
          source: '=SUM(A1)',
          description: 'He said "hello",\nthen left',
        },
      ],
      [account('Bank', '100')],
    );
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).toContain('"12.34"');
    expect(csv).toContain('"He said ""hello"",\nthen left"');
  });
});
