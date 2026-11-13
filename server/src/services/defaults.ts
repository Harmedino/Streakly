import { todayKey } from '../../../client/src/app/core/utils/dates';
export function recordDefaults(
  section: string,
  record: Record<string, unknown>,
  timeZone?: string,
) {
  const date = todayKey(timeZone),
    stamp = new Date().toISOString();
  let defaults: Record<string, unknown> = {};
  if (section === 'learning')
    defaults = {
      topic: '',
      description: '',
      category: 'Learning',
      minutes: 0,
      date,
      resources: '',
      notes: '',
      next: '',
      activityId: '',
    };
  if (['income', 'expenses', 'transactions'].includes(section))
    defaults = {
      kind: section === 'income' ? 'income' : 'expense',
      source: '',
      category: section === 'income' ? 'Other Income' : 'Other',
      date,
      description: '',
      accountId: '',
      toAccountId: '',
    };
  if (section === 'accounts') defaults = { type: 'bank', openingBalance: 0, openingDate: date };
  if (section === 'jobs')
    defaults = {
      date,
      link: '',
      status: 'Applied',
      notes: '',
      timeline: [],
      followUps: [],
      salary: '',
      location: '',
      interview: '',
    };
  if (section === 'savingsGoals') defaults = { deadline: '' };
  if (section === 'budgets') defaults = { month: date.slice(0, 7), category: '' };
  if (section === 'targets') defaults = { month: date.slice(0, 7), source: '' };
  if (section === 'goals')
    defaults = {
      description: '',
      category: 'Other',
      startDate: date,
      deadline: '',
      priority: 'medium',
      progress: 0,
      status: 'active',
      milestones: [],
      activityId: '',
      savingsId: '',
      learningCategory: '',
      updatedOn: date,
    };
  if (section === 'todos')
    defaults = {
      done: false,
      dueDate: '',
      scheduledDate: date,
      priority: 'medium',
      createdAt: stamp,
      updatedAt: stamp,
    };
  if (section === 'journal')
    defaults = {
      date,
      accomplished: '',
      learned: '',
      challenges: '',
      ideas: '',
      improve: '',
      tomorrow: '',
      mood: null,
      content: '',
    };
  return { ...defaults, ...record };
}
