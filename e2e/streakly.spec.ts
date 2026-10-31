import { test, expect, Page } from '@playwright/test';
async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
}
async function create(page: Page, name = 'Read a little', quantity = 1) {
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Activity name').fill(name);
  if (quantity > 1) {
    await dialog.getByLabel('Progress type', { exact: true }).selectOption('quantity');
    await dialog.getByLabel('Daily quantity target').fill(String(quantity));
  }
  await dialog.getByRole('button', { name: /^Create activity/ }).click();
  await expect(dialog).not.toBeVisible();
}
test('onboarding, quantity completion, note, persistence and undo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('First, what should we call you?').fill('Alex');
  await page.getByRole('button', { name: "Let's plant your first habit" }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Activity name').fill('Read a little');
  await form.getByLabel('Progress type', { exact: true }).selectOption('quantity');
  await form.getByLabel('Daily quantity target').fill('20');
  await form.getByLabel('Unit', { exact: false }).fill('pages');
  await form.getByRole('button', { name: /^Create activity/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alex');
  await page.getByRole('button', { name: 'Complete Read a little', exact: true }).click();
  const record = page.getByRole('dialog');
  await record.getByLabel('Progress · target').fill('20');
  await record.getByLabel('A note for yourself').fill('Finished chapter one.');
  await record.getByRole('button', { name: 'Save progress' }).click();
  await expect(page.getByText('1 of 1 completed', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 of 1 completed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo Read a little', exact: true }).click();
  await expect(page.getByText('0 of 1 completed', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('edit, custom categories, archive, restore and confirmed deletion', async ({ page }) => {
  await start(page);
  await create(page);
  await page.getByRole('link', { name: 'Read a little' }).click();
  await page.getByRole('button', { name: 'Edit activity' }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Activity name').fill('Read with intention');
  await form.getByRole('combobox', { name: 'Category', exact: true }).selectOption('__custom');
  await form.getByLabel('New category').fill('Quiet time');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Read with intention');
  await page.getByRole('button', { name: 'Archive activity', exact: true }).click();
  await expect(page.getByText('Quiet time · ARCHIVED', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Restore activity', exact: true }).click();
  await page.getByRole('button', { name: 'Delete activity', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Read with intention');
  await page.getByRole('button', { name: 'Delete activity', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete activity' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your activities');
});
test('historical progress, actual insights, backup validation and theme persistence', async ({
  page,
}) => {
  await start(page);
  await create(page);
  await page.getByRole('button', { name: 'Complete Read a little', exact: true }).click();
  await page.getByRole('link', { name: 'Read a little' }).click();
  await expect(page.getByText('1 little wins')).toBeVisible();
  const past = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      differentMonth: d.getMonth() !== new Date().getMonth(),
    };
  });
  await page.getByRole('button', { name: 'Edit activity' }).click();
  await page.getByLabel('Start date').fill(past.key);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('link', { name: 'Calendar', exact: true }).click();
  if (past.differentMonth) await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('button', { name: new RegExp('^' + past.label + ':') }).click();
  await page.getByRole('button', { name: 'Edit Read a little on selected date' }).click();
  await page.getByLabel('A note for yourself').fill('A good little day.');
  await page.getByRole('button', { name: 'Save progress' }).click();
  await expect(page.getByText('A good little day.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.locator('.detail-stats>div').nth(2)).toContainText('2');
  await page.screenshot({ path: '/tmp/streakly-insights.png', fullPage: true });
  await page.goto('/');
  await page.screenshot({ path: '/tmp/streakly-desktop.png', fullPage: true });
});
test('mobile navigation, backups and responsive layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await create(page, 'Take a walk');
  await expect(
    page.getByRole('button', { name: 'Complete Take a walk', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Complete Take a walk', exact: true }).click();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Settings & backup' }).click();
  await page.getByRole('button', { name: 'After hours' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^streakly-backup-/);
  const data = await page.evaluate(() => localStorage.getItem('streakly.data.v1'));
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole('alert')).toContainText('Unsupported backup version');
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(data!),
  });
  await expect(page.getByRole('dialog')).toContainText('1 activities and 1 recorded moments');
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  for (const path of ['/', '/activities', '/calendar', '/statistics', '/settings']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: '/tmp/streakly-mobile.png', fullPage: true });
});
