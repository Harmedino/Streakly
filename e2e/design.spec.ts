import { test, expect } from '@playwright/test';
import { emptyData } from '../src/app/models/tracker';
import { addDays, dateKey } from '../src/app/core/dates';
function designData(theme: 'light' | 'dark') {
  const d = emptyData(),
    today = dateKey(),
    start = addDays(today, -20),
    life = d.life!;
  d.preferences = { name: 'Alex', onboarded: true, theme };
  d.activities = ['Read a chapter', 'Move your body', 'Learn something new'].map((name, i) => ({
    id: 'habit-' + i,
    name,
    description: 'A little progress, every day.',
    icon: ['📖', '🏃', '💻'][i],
    color: ['#8270b2', '#568b9e', '#ce8053'][i],
    category: ['Learning', 'Fitness', 'Work'][i],
    startDate: start,
    frequency: 'daily',
    weekdays: [1],
    periodTarget: 1,
    interval: 1,
    quantityTarget: 1,
    progressType: 'binary',
    unit: '',
    reminder: '',
    archived: false,
    updatedAt: today + 'T12:00:00Z',
  }));
  for (let i = 0; i < 14; i++)
    for (let j = 0; j < 3; j++)
      if ((i + j) % 4 !== 0)
        d.completions.push({
          activityId: 'habit-' + j,
          date: addDays(today, -i),
          quantity: 1,
          note: i === 0 ? 'Made time for it.' : '',
        });
  d.todos = [
    {
      id: 'task-1',
      title: 'Review this week’s priorities',
      done: false,
      dueDate: today,
      scheduledDate: today,
      priority: 'high',
      createdAt: today + 'T09:00:00Z',
      updatedAt: today + 'T09:00:00Z',
    },
    {
      id: 'task-2',
      title: 'Plan next month’s learning',
      done: false,
      dueDate: addDays(today, 3),
      priority: 'medium',
      createdAt: today + 'T09:00:00Z',
      updatedAt: today + 'T09:00:00Z',
    },
  ];
  life.accounts = [
    {
      id: 'bank',
      name: 'Everyday account',
      type: 'bank',
      openingBalance: 12500000,
      openingDate: start,
    },
    {
      id: 'savings',
      name: 'Future fund',
      type: 'savings',
      openingBalance: 4000000,
      openingDate: start,
    },
  ];
  life.transactions = [
    {
      id: 'salary',
      kind: 'income',
      amount: 35000000,
      date: addDays(today, -7),
      source: 'Monthly salary',
      category: 'Salary',
      description: 'November earnings',
      accountId: 'bank',
      toAccountId: '',
    },
    ...['Food', 'Transportation', 'Subscriptions', 'Education'].map((category, i) => ({
      id: 'expense-' + i,
      kind: 'expense' as const,
      amount: [4200000, 1850000, 1200000, 2800000][i],
      date: addDays(today, -i),
      source: '',
      category,
      description: [
        'Groceries & coffee',
        'Getting around',
        'Tools for work',
        'A course worth taking',
      ][i],
      accountId: 'bank',
      toAccountId: '',
    })),
  ];
  life.budgets = [
    { id: 'food', month: today.slice(0, 7), category: 'Food', amount: 6000000 },
    { id: 'all', month: today.slice(0, 7), category: '', amount: 20000000 },
  ];
  life.savingsGoals = [
    {
      id: 'laptop',
      name: 'A new creative workspace',
      target: 20000000,
      deadline: addDays(today, 60),
    },
  ];
  life.contributions = [
    {
      id: 'deposit',
      goalId: 'laptop',
      accountId: 'bank',
      amount: 5000000,
      date: today,
      note: 'A little closer.',
    },
  ];
  life.learning = [
    {
      id: 'learn-1',
      topic: 'Designing better interfaces',
      description:
        'Explored visual hierarchy, composition and the role of whitespace in making an interface feel effortless.',
      category: 'Design',
      minutes: 90,
      date: today,
      resources: 'https://angular.dev',
      notes: 'Good design makes the next step obvious.',
      next: 'Put these principles into practice.',
      activityId: '',
    },
    {
      id: 'learn-2',
      topic: 'Angular signals and derived state',
      description:
        'Practised composing small pieces of reactive state into a clear, predictable data flow.',
      category: 'Development',
      minutes: 60,
      date: addDays(today, -1),
      resources: '',
      notes: '',
      next: 'Build a small feature.',
      activityId: '',
    },
  ];
  life.jobs = [
    {
      id: 'job-1',
      company: 'Northstar Studio',
      position: 'Frontend Developer',
      date: today,
      link: 'https://example.com',
      status: 'Interview',
      notes: 'Technical conversation next week.',
    },
    {
      id: 'job-2',
      company: 'Forma',
      position: 'Product Engineer',
      date: addDays(today, -3),
      link: '',
      status: 'Applied',
      notes: '',
    },
  ];
  life.goals = [
    {
      id: 'goal-1',
      title: 'Build a consistent learning practice',
      description: 'Make time to develop the skills that matter for my next chapter.',
      category: 'Learning',
      startDate: start,
      deadline: addDays(today, 30),
      priority: 'high',
      progress: 50,
      status: 'active',
      milestones: [
        { id: 'm-1', title: 'Choose a learning path', done: true, completedOn: addDays(today, -2) },
        { id: 'm-2', title: 'Finish the first project', done: false, completedOn: '' },
      ],
      activityId: 'habit-2',
      savingsId: '',
      learningCategory: 'Development',
      updatedOn: today,
    },
  ];
  life.journal = [
    {
      id: 'journal-1',
      date: today,
      accomplished: 'Made space for focused work and took a proper break outside.',
      learned: 'A little structure makes room for more creativity.',
      challenges: 'Letting go of the urge to do everything at once.',
      ideas: 'Keep a smaller, more intentional daily list.',
      improve: 'Start tomorrow with one clear priority.',
      tomorrow: 'Finish the first version of my project.',
      mood: 4,
    },
  ];
  return d;
}
const routes = [
  '/',
  '/activities',
  '/activities/habit-0',
  '/planner',
  '/learning',
  '/jobs',
  '/finance',
  '/goals',
  '/journal',
  '/reports',
  '/settings',
  '/calendar',
  '/statistics',
];
for (const width of [1440, 768, 390, 320])
  for (const theme of ['light', 'dark'] as const) {
    test(`all redesigned pages fit ${width}px in ${theme} mode without changing saved records`, async ({
      page,
    }) => {
      test.setTimeout(120000);
      const fixture = designData(theme),
        errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript((data) => {
        if (!localStorage.getItem('streakly.data.v1'))
          localStorage.setItem('streakly.data.v1', JSON.stringify(data));
      }, fixture);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('.storage-error')).not.toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        expect(overflow, route).toBe(false);
        if (width !== 320)
          await page.screenshot({
            path: `/tmp/streakly-redesign/${theme}-${width}-${route.replaceAll('/', '_') || 'overview'}.png`,
            fullPage: true,
            animations: 'disabled',
          });
      }
      await page.goto('/finance');
      for (const tab of ['Income', 'Expenses', 'Budgets', 'Savings', 'Accounts', 'Reports']) {
        await page.getByRole('button', { name: tab, exact: true }).click();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          tab,
        ).toBe(true);
        if (width !== 320)
          await page.screenshot({
            path: `/tmp/streakly-redesign/${theme}-${width}-finance-${tab}.png`,
            fullPage: true,
            animations: 'disabled',
          });
      }
      await page.getByRole('button', { name: 'Record expense', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeInViewport();
      const box = await page.getByRole('dialog').boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(1001);
      if (width !== 320)
        await page.screenshot({
          path: `/tmp/streakly-redesign/${theme}-${width}-form.png`,
          animations: 'disabled',
        });
      await page.keyboard.press('Escape');
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('streakly.data.v1')!),
      );
      expect(saved).toEqual(fixture);
      expect(errors).toEqual([]);
    });
  }
