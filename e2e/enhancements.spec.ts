import { test, expect } from '@playwright/test';
test('templates, past progress, freezes, planned rest, pause and favorite organization', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  const dates = await page.evaluate(() => {
    const key = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date(),
      old = new Date(),
      yesterday = new Date(),
      tomorrow = new Date();
    old.setDate(old.getDate() - 2);
    yesterday.setDate(yesterday.getDate() - 1);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { today: key(today), old: key(old), yesterday: key(yesterday), tomorrow: key(tomorrow) };
  });
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Activity template').selectOption('code');
  await expect(dialog.getByLabel('Activity name')).toHaveValue('Code every day');
  await dialog.getByLabel('Start date').fill(dates.old);
  await dialog.getByRole('button', { name: 'Create activity', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Complete Code every day', exact: true }).click();
  await page.goto('/calendar?date=' + dates.old);
  await page.getByRole('button', { name: 'Edit Code every day on selected date' }).click();
  await dialog.getByRole('button', { name: 'Save progress' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('link', { name: 'Code every day', exact: true }).click();
  await page.getByLabel('Choose a date', { exact: true }).fill(dates.yesterday);
  await page.getByRole('button', { name: 'Use streak freeze', exact: true }).click();
  await expect(page.getByText(/1 of 2 freezes used/)).toBeVisible();
  await expect(page.locator('.detail-stats>div').first()).toContainText('2');
  await page.getByLabel('Choose a date', { exact: true }).fill(dates.tomorrow);
  await page.getByRole('button', { name: 'Plan rest day', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Remove planned rest', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause activity', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume activity', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume activity', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause activity', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'All activities', exact: true }).click();
  await page.getByRole('button', { name: 'Pin favorite', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unpin favorite', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Compact view', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Comfortable view', exact: true })).toBeVisible();
});
test('duration progress, daily notes and real multi-tab synchronization', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Activity template').selectOption('study');
  await expect(dialog.getByLabel('Progress type', { exact: true })).toHaveValue('duration');
  await dialog.getByRole('button', { name: 'Create activity', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Complete Study for one hour', exact: true }).click();
  await dialog.getByLabel('Progress · target').fill('30');
  await dialog.getByRole('button', { name: 'Save progress' }).click();
  await expect(page.getByText('30 minutes remaining', { exact: true })).toBeVisible();
  await page
    .getByLabel('Daily personal note', { exact: true })
    .fill('Showed up, even for half an hour.');
  await page.getByRole('button', { name: 'Save daily note' }).click();
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.getByText('30 minutes remaining', { exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Complete Study for one hour', exact: true }).click();
  dialog = other.getByRole('dialog');
  await dialog.getByLabel('Progress · target').fill('60');
  await dialog.getByRole('button', { name: 'Save progress' }).click();
  await expect(
    page.getByRole('button', { name: 'Undo Study for one hour', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Daily personal note', { exact: true })).toHaveValue(
    'Showed up, even for half an hour.',
  );
});
