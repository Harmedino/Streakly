export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'savings' | 'wallet';
  openingBalance: number;
  openingDate: string;
}
export interface Transaction {
  id: string;
  kind: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  source: string;
  category: string;
  description: string;
  accountId: string;
  toAccountId: string;
  recurringId?: string;
  occurrence?: string;
}
export interface RecurringTransaction {
  id: string;
  kind: 'income' | 'expense';
  amount: number;
  startDate: string;
  source: string;
  category: string;
  description: string;
  accountId: string;
  active: boolean;
  posted: string[];
}
export interface Budget {
  id: string;
  month: string;
  category: string;
  amount: number;
}
export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  deadline: string;
}
export interface SavingsContribution {
  id: string;
  goalId: string;
  accountId: string;
  amount: number;
  date: string;
  note: string;
}
export interface LearningEntry {
  id: string;
  topic: string;
  description: string;
  category: string;
  minutes: number;
  date: string;
  resources: string;
  notes: string;
  next: string;
  activityId: string;
}
export interface JobApplication {
  id: string;
  company: string;
  position: string;
  date: string;
  link: string;
  status: 'Applied' | 'Interview' | 'Rejected' | 'Offer';
  notes: string;
}
export interface GoalMilestone {
  id: string;
  title: string;
  done: boolean;
  completedOn: string;
}
export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  status: 'active' | 'completed' | 'paused';
  milestones: GoalMilestone[];
  activityId: string;
  savingsId: string;
  learningCategory: string;
  updatedOn: string;
}
export interface JournalEntry {
  id: string;
  date: string;
  accomplished: string;
  learned: string;
  challenges: string;
  ideas: string;
  improve: string;
  tomorrow: string;
  mood: number | null;
}
export interface LearningCredit {
  activityId: string;
  date: string;
  baseQuantity: number;
  baseNote: string;
}
export interface LifeData {
  accounts: Account[];
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  contributions: SavingsContribution[];
  learning: LearningEntry[];
  jobs: JobApplication[];
  goals: Goal[];
  journal: JournalEntry[];
  learningCredits: LearningCredit[];
  goalEvents: { id: string; goalId: string; date: string; from: number; to: number }[];
  incomeCategories: string[];
  expenseCategories: string[];
}
export const INCOME_CATEGORIES = [
  'Salary',
  'Freelancing',
  'Side Hustle',
  'Business',
  'Gifts',
  'Bonuses',
  'Other Income',
];
export const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Data and Airtime',
  'Rent',
  'Electricity',
  'Shopping',
  'Entertainment',
  'Subscriptions',
  'Education',
  'Family',
  'Health',
  'Savings Transfers',
  'Other',
];
export function emptyLife(): LifeData {
  return {
    accounts: [],
    transactions: [],
    recurring: [],
    budgets: [],
    savingsGoals: [],
    contributions: [],
    learning: [],
    jobs: [],
    goals: [],
    journal: [],
    learningCredits: [],
    goalEvents: [],
    incomeCategories: [...INCOME_CATEGORIES],
    expenseCategories: [...EXPENSE_CATEGORIES],
  };
}
