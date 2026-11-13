import { test, expect } from '@playwright/test';
test('mark streak stays visible when completed or paused on mobile and desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('details.activity-more > summary').click();
  await dialog.getByLabel('Activity template').selectOption('code');
  await dialog.getByRole('button', { name: 'Create activity', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const mark = page.getByRole('button', { name: 'Complete Code every day', exact: true });
  await expect(mark).toHaveText(/Mark streak/);
  await expect(mark).toBeEnabled();
  await mark.click();
  const marked = page.getByRole('button', { name: 'Already marked: Code every day', exact: true });
  await expect(marked).toBeVisible();
  await expect(marked).toBeDisabled();
  await expect(
    page.getByText('Marked today. A new day starts at local midnight.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo Code every day', exact: true }).click();
  await expect(mark).toBeEnabled();
  await page.locator('.activity-info').filter({ hasText: 'Code every day' }).click();
  await expect(
    page.getByRole('button', { name: 'Complete Code every day', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause activity', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Complete Code every day', exact: true }),
  ).toBeDisabled();
  await page.goto('/');
  await expect(
    page.getByText('Paused. Resume the activity to mark it.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Complete Code every day', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Complete Code every day', exact: true }),
  ).toBeDisabled();
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page.getByRole('button', { name: 'Complete Code every day', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: '/tmp/streakly-disabled-mark.png', fullPage: true });
});
