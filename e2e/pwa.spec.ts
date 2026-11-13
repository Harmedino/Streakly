import { test, expect } from '@playwright/test';
test('production service worker reloads offline, including lazy routes and saved progress', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  const manifest = await page.evaluate(async () =>
    fetch('/manifest.webmanifest').then((r) => r.json()),
  );
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('details.activity-more > summary').click();
  await dialog.getByLabel('Activity template').selectOption('code');
  await dialog.getByRole('button', { name: 'Create activity', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 45000 })
    .toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Complete Code every day', exact: true }).click();
  await expect(page.getByText('1 of 1 completed', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /My Streaks/ }).click();
  await expect(page).toHaveURL(/\/activities$/);
  await expect(page.locator('.activity-info').filter({ hasText: 'Code every day' })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('button', { name: 'Undo Code every day', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Daily Planner', exact: true }).click();
  await page.getByLabel('What needs doing?').fill('An offline little task');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'An offline little task', exact: true }),
  ).toBeVisible();
  await page.goto('/finance');
  await page.getByRole('button', { name: 'Record income', exact: true }).click();
  const income = page.getByRole('dialog');
  await income.getByLabel('Amount (₦)', { exact: true }).fill('10.50');
  await income.getByLabel('Income source', { exact: true }).fill('Offline receipt');
  await income.getByRole('button', { name: 'Save record', exact: true }).click();
  await expect(income).not.toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.locator('.finance-stats>div').filter({ hasText: 'Total income' }),
  ).toContainText('10.50');
  await page.goto('/learning');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Learning journal');
});
