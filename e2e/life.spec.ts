import { test, expect, Page } from '@playwright/test';
async function start(page: Page, path = '/finance') {
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  await page.goto(path);
}
async function save(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Save record', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}
async function account(page: Page, name: string, balance: string, type = 'bank') {
  await page.getByRole('button', { name: 'Accounts', exact: true }).click();
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Account name', { exact: true }).fill(name);
  await d.getByRole('combobox', { name: 'Account type', exact: true }).selectOption(type);
  await d.getByLabel('Opening balance (₦)', { exact: false }).fill(balance);
  await save(page);
}
test('finance tracks opening balances, income, expenses, transfers and savings without double counting', async ({
  page,
}) => {
  test.setTimeout(90000);
  await start(page);
  await account(page, 'Main bank', '100000');
  await account(page, 'Savings bank', '0', 'savings');
  await page.getByRole('button', { name: 'Record income', exact: true }).click();
  let d = page.getByRole('dialog');
  await d.getByLabel('Amount (₦)', { exact: true }).fill('50000');
  await d.getByLabel('Income source', { exact: true }).fill('Salary employer');
  await d
    .getByRole('combobox', { name: 'Payment account', exact: true })
    .selectOption({ label: 'Main bank' });
  await save(page);
  await page.getByRole('button', { name: 'Record expense', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Amount (₦)', { exact: true }).fill('10000');
  await d.getByLabel('Category', { exact: true }).fill('Food');
  await d
    .getByRole('combobox', { name: 'Payment account', exact: true })
    .selectOption({ label: 'Main bank' });
  await save(page);
  await page.getByRole('button', { name: 'Transfer between accounts', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Amount (₦)', { exact: true }).fill('20000');
  await d
    .getByRole('combobox', { name: 'From account', exact: true })
    .selectOption({ label: 'Main bank' });
  await d
    .getByRole('combobox', { name: 'To account', exact: true })
    .selectOption({ label: 'Savings bank' });
  await save(page);
  const available = page.locator('.finance-stats>div').filter({ hasText: 'Available balance' });
  await expect(available).toContainText('120,000');
  await expect(
    page.locator('.finance-stats>div').filter({ hasText: 'Total expenses' }),
  ).toContainText('10,000');
  await page.getByRole('button', { name: 'Savings', exact: true }).click();
  await page.getByRole('button', { name: 'Add savings goal', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Savings goal name', { exact: true }).fill('Laptop');
  await d.getByLabel('Target amount (₦)', { exact: true }).fill('50000');
  await d.getByLabel('Target date', { exact: true }).fill('2027-12-01');
  await save(page);
  await page.getByRole('button', { name: 'Add / withdraw', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Amount (₦)', { exact: true }).fill('10000');
  await d
    .getByRole('combobox', { name: 'Account holding the money', exact: true })
    .selectOption({ label: 'Main bank' });
  await save(page);
  await expect(available).toContainText('110,000');
  await page.getByRole('button', { name: 'Add / withdraw', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByRole('combobox', { name: 'Allocation type', exact: true }).selectOption('withdraw');
  await d.getByLabel('Amount (₦)', { exact: true }).fill('4000');
  await d
    .getByRole('combobox', { name: 'Account holding the money', exact: true })
    .selectOption({ label: 'Main bank' });
  await save(page);
  await expect(available).toContainText('114,000');
  await expect(
    page.locator('.finance-stats>div').filter({ hasText: 'Total savings' }),
  ).toContainText('26,000');
  await page.reload();
  await expect(available).toContainText('114,000');
  await page.getByRole('button', { name: 'Reports', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('.csv');
  await page.screenshot({ path: '/tmp/streakly-finance.png', fullPage: true });
});
test('budgets, recurring income, edit/delete, and future months work from actual records', async ({
  page,
}) => {
  test.setTimeout(90000);
  await start(page);
  await page.getByRole('button', { name: 'Record expense', exact: true }).click();
  let d = page.getByRole('dialog');
  await d.getByLabel('Amount (₦)', { exact: true }).fill('500');
  await save(page);
  await page.getByRole('button', { name: 'Budgets', exact: true }).click();
  await page.getByRole('button', { name: 'Add budget', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Monthly budget (₦)', { exact: true }).fill('400');
  await save(page);
  await expect(page.getByText(/Budget exceeded by/)).toBeVisible();
  await page.getByRole('button', { name: 'Income', exact: true }).click();
  await page.getByRole('button', { name: 'Add schedule', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Amount (₦)', { exact: true }).fill('1000');
  await d.getByLabel('Source / merchant', { exact: true }).fill('Freelance client');
  const previous = await page.evaluate(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  await d.getByLabel('First monthly due date', { exact: true }).fill(previous);
  await save(page);
  await page.getByRole('button', { name: /Review 2 due recurring records/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Record confirmed payments', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Review 0 due recurring records/ })).toBeDisabled();
  await page.getByLabel('Search transactions', { exact: true }).fill('Freelance');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.locator('tbody tr').getByRole('button', { name: 'Edit', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Amount (₦)', { exact: true }).fill('1200');
  await save(page);
  await expect(page.locator('tbody')).toContainText('1,200');
  await page.locator('tbody tr').getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete record', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('tbody')).toContainText('No matching');
});
test('learning, applications, goals, reflection, planner and combined reports persist together', async ({
  page,
}) => {
  test.setTimeout(120000);
  await start(page, '/activities');
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  let d = page.getByRole('dialog');
  await d.getByLabel('Activity template', { exact: true }).selectOption('study');
  await d.getByRole('button', { name: 'Create activity', exact: true }).click();
  await expect(d).not.toBeVisible();
  await page.goto('/learning');
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Learning topic', { exact: true }).fill('Angular signals');
  await d
    .getByLabel('What I learned', { exact: true })
    .fill('Derived state with computed signals.');
  await d.getByLabel('Time spent (minutes)', { exact: true }).fill('60');
  await d
    .getByRole('combobox', { name: 'Contribute to an existing streak', exact: false })
    .selectOption({ label: 'Study for one hour' });
  await save(page);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('streakly.data.v1')!).completions.length,
    ),
  ).toBe(1);
  await page.goto('/jobs');
  await page.getByRole('button', { name: 'Add application', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Company name', { exact: true }).fill('Acme');
  await d.getByLabel('Job position', { exact: true }).fill('Frontend developer');
  await d
    .getByRole('combobox', { name: 'Application status', exact: true })
    .selectOption('Interview');
  await save(page);
  await page.getByLabel('Application status filter', { exact: true }).selectOption('Rejected');
  await expect(page.getByText('Frontend developer · Acme', { exact: true })).not.toBeVisible();
  await page.getByLabel('Application status filter', { exact: true }).selectOption('Interview');
  await expect(page.getByText('Frontend developer · Acme', { exact: true })).toBeVisible();
  await page.goto('/goals');
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Goal title', { exact: true }).fill('Build my skills');
  await d.getByLabel('Deadline', { exact: true }).fill('2027-01-01');
  await d
    .getByLabel('Milestones · one per line', { exact: false })
    .fill('Read the guide\nBuild a project');
  await save(page);
  await page.getByRole('button', { name: 'Read the guide', exact: true }).click();
  await expect(page.getByText(/50% complete/)).toBeVisible();
  await page.goto('/journal');
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('What I accomplished today', { exact: true }).fill('Built something useful.');
  await d.getByLabel('Tomorrow’s priorities', { exact: true }).fill('Keep learning.');
  await d.getByRole('combobox', { name: 'Mood · optional', exact: true }).selectOption('4');
  await save(page);
  await page.goto('/planner');
  await page.getByLabel('What needs doing?', { exact: true }).fill('Practice TypeScript');
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('high');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete task: Practice TypeScript', exact: true })
    .click();
  await page.goto('/reports');
  await expect(
    page.getByText('60 minutes of learning, 1 applications, and 1 completed tasks.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('60 minutes of learning, 1 applications, and 1 completed tasks.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.dashboard-life-stats')).toContainText('1 h');
  await expect(page.locator('.dashboard-life-stats')).toContainText('Active goals');
});
test('new modules fit phone and tablet widths and backups include all modules', async ({
  page,
}) => {
  test.setTimeout(90000);
  await start(page, '/settings');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      '/',
      '/finance',
      '/learning',
      '/jobs',
      '/goals',
      '/journal',
      '/planner',
      '/reports',
      '/settings',
    ]) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await page.goto('/finance');
  await page.getByRole('button', { name: 'Record income', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON backup', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('.json');
  const data = await page.evaluate(() => localStorage.getItem('streakly.data.v1'));
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(data!),
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Replace with backup', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => !!localStorage.getItem('streakly.backup.before-restore'))).toBe(
    true,
  );
});
