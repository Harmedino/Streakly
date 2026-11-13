import { test, expect } from '@playwright/test';
test('mobile to-do list supports creation, edits, completion, undo, persistence and confirmed removal', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Daily Planner', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Daily planner');
  await page.getByLabel('What needs doing?').fill('Book an appointment');
  await page.getByText('More Options', { exact: true }).click();
  await page.getByLabel('Due date optional').fill('2027-01-01');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Book an appointment' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit task: Book an appointment', exact: true }).click();
  await page.getByLabel('Task name', { exact: true }).fill('Call the dentist');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.getByRole('button', { name: 'Complete task: Call the dentist', exact: true }).click();
  await page.getByRole('button', { name: /^Done/ }).click();
  await page.getByRole('button', { name: 'Undo task: Call the dentist', exact: true }).click();
  await page.getByRole('button', { name: /^To do/ }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Call the dentist' })).toBeVisible();
  const other = await context.newPage();
  await other.goto('/todos');
  await page.getByRole('button', { name: 'Complete task: Call the dentist', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Call the dentist' })).not.toBeVisible();
  await page.getByRole('button', { name: /^Done/ }).click();
  await page.getByRole('button', { name: 'Clear completed', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Call the dentist' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete task: Call the dentist', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete task', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Call the dentist' })).not.toBeVisible();
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/streakly-todos.png', fullPage: true });
});
