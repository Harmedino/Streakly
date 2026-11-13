import { test, expect } from '@playwright/test';
test('a user can mark past days directly from an activity without completing today', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  const dates = await page.evaluate(() => {
    const key = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(),
      older = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    older.setDate(older.getDate() - 2);
    return { yesterday: key(yesterday), older: key(older) };
  });
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('details.activity-more > summary').click();
  await dialog.getByLabel('Activity template').selectOption('code');
  await dialog.getByLabel('Start date', { exact: true }).fill(dates.older);
  await dialog.getByRole('button', { name: 'Create activity', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole('button', { name: 'Mark a past day for Code every day', exact: true })
    .click();
  await expect(dialog.getByLabel('Completion date', { exact: true })).toHaveValue(dates.yesterday);
  await dialog.getByLabel('Completion date', { exact: true }).fill('2200-01-01');
  await expect(dialog.getByRole('button', { name: 'Save progress' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Yesterday', exact: true }).click();
  await dialog.getByLabel('A note for yourself').fill('Done yesterday, logged today.');
  await dialog.getByRole('button', { name: 'Save progress' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('0 of 1 completed', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Mark a past day for Code every day', exact: true })
    .click();
  await dialog.getByLabel('Completion date', { exact: true }).fill(dates.older);
  await dialog.getByRole('button', { name: 'Save progress' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.activity-row .streak')).toContainText('2');
  await page.getByRole('button', { name: 'Complete Code every day', exact: true }).click();
  await expect(page.getByText('1 of 1 completed', { exact: true })).toBeVisible();
  await expect(page.locator('.activity-row .streak')).toContainText('3');
  await page.reload();
  await expect(page.locator('.activity-row .streak')).toContainText('3');
});

test('an open dashboard starts a new manual check-in at midnight without waiting 24 hours', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-30T23:58:00Z') });
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('details.activity-more > summary').click();
  await dialog.getByLabel('Activity template').selectOption('code');
  await dialog.getByRole('button', { name: 'Create activity', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Complete Code every day', exact: true }).click();
  await expect(page.getByText('1 of 1 completed', { exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date('2026-10-30T23:59:58Z'));
  await page.clock.runFor(2200);
  await page.clock.resume();
  await expect(page.getByText('0 of 1 completed', { exact: true })).toBeVisible();
  await expect(page.locator('.activity-row .streak')).toContainText('1');
  await page.getByRole('button', { name: 'Complete Code every day', exact: true }).click();
  await expect(page.locator('.activity-row .streak')).toContainText('2');
});
