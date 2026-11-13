import { test, expect, Page } from '@playwright/test';
import { emptyData } from '../client/src/app/core/models/tracker';
const password = 'a-strong-personal-password-2026';
async function signup(page: Page) {
  const email = 'browser-' + crypto.randomUUID() + '@example.com';
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
  return email;
}
async function save(page: Page, label = 'Save record') {
  if (label === 'Save note') {
    await page
      .locator('app-learning-editor')
      .getByRole('button', { name: label, exact: true })
      .click();
    await expect(page.locator('app-rich-editor')).not.toBeVisible();
  } else {
    await page.getByRole('dialog').getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  }
}
test('server-backed migration, simple notes, automatic streaks, persistence and protected reset work together', async ({
  page,
}) => {
  test.setTimeout(120000);
  const legacy = emptyData();
  legacy.preferences = { name: 'Legacy Alex', theme: 'light', onboarded: true };
  legacy.life!.learning = [
    {
      id: 'old',
      topic: 'Original note',
      description: 'Keep my leap-day history.',
      category: 'Learning',
      minutes: 0,
      date: '2024-02-29',
      resources: '',
      notes: '',
      next: '',
      activityId: '',
    },
  ];
  const raw = JSON.stringify(legacy);
  await page.addInitScript((raw) => {
    if (!localStorage.getItem('streakly.data.v1')) localStorage.setItem('streakly.data.v1', raw);
  }, raw);
  await signup(page);
  await page.getByRole('button', { name: 'Preview browser records' }).click();
  await expect(page.locator('.migration-counts')).toContainText('1 learning');
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original backup' }).click();
  await backup;
  await page.getByRole('button', { name: 'Confirm import to my account' }).click();
  await expect(page.locator('main h1')).toContainText('Legacy Alex');
  expect(await page.evaluate(() => localStorage.getItem('streakly.data.v1'))).toBe(raw);
  await page.getByRole('button', { name: 'New activity', exact: true }).click();
  let d = page.getByRole('dialog');
  await d.getByLabel('Activity name', { exact: true }).fill('Daily learning');
  await d.getByText('More Options', { exact: true }).click();
  await d.getByLabel('Tracking mode', { exact: true }).selectOption('learning');
  await d.getByRole('button', { name: /^Create activity/ }).click();
  await expect(d).not.toBeVisible();
  await page.goto('/learning');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  d = page.locator('app-learning-editor');
  await d
    .getByRole('textbox', { name: 'Note content', exact: true })
    .fill(
      '## A useful discovery\n**Small notes** can build consistency.\n- [ ] Practise tomorrow\n```\nconst progress = true;\n```',
    );
  await save(page, 'Save note');
  await expect(page.locator('app-markdown').filter({ hasText: 'Small notes' })).toBeVisible();
  await page.reload();
  await page.locator('.note-list-item').filter({ hasText: 'Small notes' }).click();
  await expect(page.locator('.note-reader')).toContainText('Small notes');
  await page.goto('/activities');
  await expect(
    page.getByRole('button', { name: 'Automatic tracking: Daily learning' }),
  ).toBeDisabled();
  await expect(page.locator('.mark-reason')).toContainText('Completed automatically');
  await page.goto('/settings');
  await page.getByLabel('Section to reset').selectOption('all');
  await page.getByRole('button', { name: 'Reset selected section' }).click();
  d = page.getByRole('dialog');
  await expect(d.getByRole('button', { name: 'Confirm reset', exact: true })).toBeDisabled();
  await d.getByLabel('Reset confirmation', { exact: true }).fill('RESET');
  await page.route('**/api/reset', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: { message: 'Test connection interrupted. No deletion.' },
      }),
    }),
  );
  await d.getByRole('button', { name: 'Confirm reset', exact: true }).click();
  await expect(d).toBeVisible();
  await expect(d.getByRole('alert')).toContainText('Test connection interrupted');
  await page.unroute('**/api/reset');
  await d.getByRole('button', { name: 'Confirm reset', exact: true }).click();
  await expect(d).not.toBeVisible();
  await page.goto('/learning');
  await expect(page.getByRole('heading', { name: 'Original note', exact: true })).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('streakly.data.v1'))).toBe(raw);
});
test('simple finance, real salary allocations, targets and edits persist on the backend', async ({
  page,
}) => {
  await signup(page);
  await page.goto('/finance');
  await page.getByRole('button', { name: 'Record income', exact: true }).click();
  let d = page.getByRole('dialog');
  await expect(d.getByLabel('Payment account', { exact: true })).not.toBeVisible();
  await d.getByLabel('Amount (₦)', { exact: true }).fill('3000');
  await d.getByLabel('Income source', { exact: true }).fill('Employer');
  await save(page);
  await page.getByRole('button', { name: 'Record expense', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Amount (₦)', { exact: true }).fill('500');
  await d.getByLabel('Category', { exact: true }).fill('Food');
  await save(page);
  await page.getByRole('button', { name: 'Salary', exact: true }).click();
  await expect(
    page.locator('.life-stats>div').filter({ hasText: 'Payment remaining' }),
  ).toContainText('3,000');
  await page.getByRole('button', { name: 'Link spending or savings', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Record to fund', { exact: true }).selectOption({ index: 1 });
  await d.getByLabel('Amount', { exact: true }).fill('300');
  await save(page, 'Save allocations');
  await expect(
    page.locator('.life-stats>div').filter({ hasText: 'Payment remaining' }),
  ).toContainText('2,700');
  await page.getByRole('button', { name: 'Targets', exact: true }).click();
  await page.getByRole('button', { name: 'Add target', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Amount', { exact: true }).fill('5000');
  await save(page, 'Save target');
  await expect(page.getByText(/60%/)).toBeVisible();
  await page.getByRole('button', { name: 'Edit target', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Amount', { exact: true }).fill('6000');
  await save(page, 'Save target');
  await expect(page.getByText(/50%/)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Salary', exact: true }).click();
  await expect(
    page.locator('.life-stats>div').filter({ hasText: 'Payment remaining' }),
  ).toContainText('2,700');
});
test('all server pages and compact forms fit six representative viewport widths', async ({
  page,
}) => {
  test.setTimeout(120000);
  await signup(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 375, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      '/',
      '/activities',
      '/planner',
      '/learning',
      '/jobs',
      '/finance',
      '/goals',
      '/journal',
      '/reports',
      '/settings',
    ]) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        path + ' at ' + width,
      ).toBe(true);
    }
    await page.goto('/learning');
    await page.getByRole('button', { name: 'New note', exact: true }).click();
    await expect(page.locator('app-rich-editor')).toBeInViewport();
    await page
      .getByRole('textbox', { name: 'Note content', exact: true })
      .fill('A mobile-friendly draft.');
    await page.screenshot({ path: '/tmp/streakly-backend/notes-' + width + '.png' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Sign out', exact: true }).isVisible();
  }
  await page.screenshot({ path: '/tmp/streakly-backend/final.png', fullPage: true });
});

test('failed note saves and expired sessions preserve the editor for retry', async ({ page }) => {
  const email = await signup(page);
  await page.goto('/learning');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  const dialog = page.locator('app-learning-editor');
  await dialog
    .getByRole('textbox', { name: 'Note content', exact: true })
    .fill('Keep this unsaved note through a connection failure.');
  await page.route('**/api/workspace', async (route) => {
    if (route.request().method() === 'PUT')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: { message: 'Connection interrupted. Retry safely.' },
        }),
      });
    else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Connection interrupted');
  await expect(dialog.getByRole('textbox', { name: 'Note content', exact: true })).toContainText(
    'Keep this unsaved note through a connection failure.',
  );
  await page.unroute('**/api/workspace');
  await page.context().clearCookies();
  await dialog.getByRole('button', { name: 'Save note', exact: true }).click();
  const reauth = page.locator('.reauth-overlay');
  await expect(reauth).toBeVisible();
  await expect(reauth.getByLabel('Email', { exact: true })).toHaveValue(email);
  await reauth.getByLabel('Password', { exact: true }).fill(password);
  await reauth.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(reauth).not.toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Note content', exact: true })).toContainText(
    'Keep this unsaved note through a connection failure.',
  );
  await save(page, 'Save note');
  await page.reload();
  await page.locator('.note-list-item').filter({ hasText: 'Keep this unsaved note' }).click();
  await expect(page.locator('app-markdown')).toContainText('Keep this unsaved note');
});

test.describe('server-hosted service worker', () => {
  test.use({ serviceWorkers: 'allow' });
  test('caches the account shell without caching account data or falling back to legacy records', async ({
    page,
    context,
  }) => {
    await signup(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 45000 })
      .toBe(true);
    const apiCache = await page.evaluate(async () => {
      const keys = await caches.keys();
      const requests = await Promise.all(keys.map(async (key) => (await caches.open(key)).keys()));
      return requests.flat().some((request) => new URL(request.url).pathname.startsWith('/api/'));
    });
    expect(apiCache).toBe(false);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Cannot connect to your server.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: "I'll explore first" })).not.toBeVisible();
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Retry connection', exact: true }).click();
    await expect(page.locator('main h1')).toBeVisible();
  });
});
