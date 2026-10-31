import { test, expect } from '@playwright/test';

test('create, choose, persist and rename a personal category on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('.sidebar')).toHaveClass(/mobile-open/);
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Create an activity', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Activity name').fill('Make something meaningful');
  await dialog.getByRole('button', { name: '+ New category', exact: true }).click();
  await dialog.getByLabel('New category', { exact: true }).fill('  Creative time  ');
  await dialog.getByRole('button', { name: 'Create activity', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await nav.getByRole('link', { name: /My activities/ }).click();
  await page.getByLabel('Filter category').selectOption('Creative time');
  await expect(page.getByRole('link', { name: /Make something meaningful/ })).toBeVisible();
  await page.getByRole('link', { name: 'Open personal settings' }).click();
  await page.getByRole('button', { name: 'Rename category Creative time', exact: true }).click();
  await page.getByLabel('Rename Creative time').fill('My creative space');
  await page.getByRole('button', { name: 'Save category', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Rename category My creative space' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await nav.getByRole('link', { name: /My activities/ }).click();
  await page.getByLabel('Filter category').selectOption('My creative space');
  await expect(page.getByRole('link', { name: /Make something meaningful/ })).toContainText(
    'My creative space',
  );
  await page.getByRole('link', { name: /Make something meaningful/ }).click();
  await page.getByRole('button', { name: 'Edit activity' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Category', exact: true })).toHaveValue(
    'My creative space',
  );
});

test('phone and tablet layouts preserve the existing navigation and fit forms', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', '/activities', '/calendar', '/statistics', '/settings']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.locator('.sidebar')).toHaveClass(/mobile-open/);
    await page
      .locator('.sidebar')
      .getByRole('button', { name: 'Create an activity', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    expect(
      await dialog.getByLabel('Activity name').evaluate((e) => getComputedStyle(e).fontSize),
    ).toBe('16px');
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await expect(dialog).not.toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: '/tmp/streakly-mobile-refined.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('.brand')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.brand')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
});

test('reduced motion disables animations without hiding content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: "I'll explore first" }).click();
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  expect(
    await page.locator('.modal-backdrop').evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
