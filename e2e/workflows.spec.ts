import { test, expect, Page } from '@playwright/test';
import { addDays, dateKey } from '../client/src/app/core/utils/dates';
async function signup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page
    .getByLabel('Email', { exact: true })
    .fill('connected-' + crypto.randomUUID() + '@example.com');
  await page.getByLabel('Password', { exact: true }).fill('a-strong-streakly-test-password-2026');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
}
async function save(page: Page, name: string) {
  await page.getByRole('dialog').getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}
for (const width of [375, 1440]) {
  test(
    'goals, five milestones, linked planner credits, editing and persistence at ' + width,
    async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width, height: 900 });
      await signup(page);
      await page.goto('/goals');
      await page.getByRole('button', { name: 'Add goal', exact: true }).click();
      await page.getByLabel('Goal title', { exact: true }).fill('Finish Module 1');
      await save(page, 'Save goal');
      let card = page.locator('app-goal-card').filter({ hasText: 'Finish Module 1' });
      await card.getByRole('button', { name: 'Mark completed', exact: true }).click();
      await expect(card).toContainText('100%');
      await page.goto('/reports');
      await expect(
        page.locator('.completed-item').filter({ hasText: 'Finish Module 1' }),
      ).toBeVisible();
      await page.goto('/goals');
      await page.getByRole('button', { name: 'Add goal', exact: true }).click();
      let d = page.getByRole('dialog');
      await d.getByLabel('Goal title', { exact: true }).fill('Complete Angular Course');
      await d.getByText('More Options', { exact: true }).click();
      await d.getByLabel('Progress tracking method', { exact: true }).selectOption('milestones');
      for (let i = 1; i <= 5; i++) {
        await d.getByLabel('New milestone', { exact: true }).fill('Finish Module ' + i);
        await d.getByRole('button', { name: 'Add milestone', exact: true }).click();
      }
      await save(page, 'Save goal');
      await page.getByRole('link', { name: 'Complete Angular Course', exact: true }).click();
      await page
        .getByRole('button', { name: 'Complete milestone: Finish Module 1', exact: true })
        .click();
      await expect(page.getByRole('heading', { name: '20% complete', exact: true })).toBeVisible();
      await page
        .getByRole('button', { name: 'Complete milestone: Finish Module 2', exact: true })
        .click();
      await expect(page.getByRole('heading', { name: '40% complete', exact: true })).toBeVisible();
      const goalUrl = page.url();
      await page.screenshot({
        path: '/tmp/streakly-connected/goals-' + width + '.png',
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Move up: Finish Module 5', exact: true }).click();
      await expect(page.getByRole('heading', { name: '40% complete', exact: true })).toBeVisible();
      const milestone = page.locator('.milestone-row').filter({ hasText: 'Finish Module 3' });
      await milestone.getByRole('button', { name: 'Edit', exact: true }).click();
      await page.getByLabel('Milestone title', { exact: true }).fill('Build routing exercise');
      await page.getByRole('button', { name: 'Save milestone', exact: true }).click();
      await expect(
        page.getByRole('button', {
          name: 'Complete milestone: Build routing exercise',
          exact: true,
        }),
      ).toBeVisible();
      await page.getByRole('link', { name: 'Add a related task', exact: false }).click();
      await page.getByLabel('What needs doing?', { exact: true }).fill('Practise nested routes');
      await page
        .getByLabel('Related milestone', { exact: true })
        .selectOption({ label: 'Build routing exercise' });
      await page
        .getByLabel('Complete the linked milestone with this task', { exact: true })
        .check();
      await page.getByRole('button', { name: 'Add task', exact: true }).click();
      await page
        .getByRole('button', { name: 'Complete task: Practise nested routes', exact: true })
        .click();
      await page.goto(goalUrl);
      await expect(page.getByRole('heading', { name: '60% complete', exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', { name: '60% complete', exact: true })).toBeVisible();
      await expect(
        page.getByText('Completed by linked planner task.', { exact: false }),
      ).toBeVisible();
      await page.goto('/planner');
      await page.getByRole('button', { name: /^Done/ }).click();
      await page
        .getByRole('button', { name: 'Undo task: Practise nested routes', exact: true })
        .click();
      await page.goto(goalUrl);
      await expect(page.getByRole('heading', { name: '40% complete', exact: true })).toBeVisible();
    },
  );
  test(
    'job follow-ups, real rich text, free journal and accurate daily reports at ' + width,
    async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width, height: 900 });
      await signup(page);
      await page.goto('/jobs');
      await page
        .locator('.page-heading')
        .getByRole('button', { name: 'Add application', exact: true })
        .click();
      await page.getByLabel('Company name', { exact: true }).fill('Northstar');
      await page.getByLabel('Job role', { exact: true }).fill('Frontend Engineer');
      await save(page, 'Save application');
      await page.getByLabel('Status for Northstar', { exact: true }).selectOption('Interview');
      await page.getByRole('link', { name: 'Open application', exact: true }).click();
      await expect(page.getByText('Status changed to Interview', { exact: true })).toBeVisible();
      await page.getByLabel('Follow-up task', { exact: true }).fill('Follow up with recruiter');
      await page.getByRole('button', { name: 'Add follow-up', exact: true }).click();
      await expect(page.locator('.follow-row')).toContainText('Follow up with recruiter');
      await page.getByLabel('Event title', { exact: true }).fill('Interview invitation');
      await page.getByLabel('Event notes', { exact: false }).fill('Prepare a small Angular demo.');
      await page.getByRole('button', { name: 'Add event', exact: true }).click();
      await expect(
        page.locator('.event').filter({ hasText: 'Interview invitation' }),
      ).toContainText('Prepare a small Angular demo.');
      await page.screenshot({
        path: '/tmp/streakly-connected/job-' + width + '.png',
        fullPage: true,
      });
      await page.goto('/');
      await expect(
        page.locator('.attention-panel').filter({ hasText: 'Needs attention' }),
      ).toContainText('Follow up with recruiter');
      await page.goto('/learning');
      await page.getByRole('button', { name: 'New note', exact: true }).click();
      await page.getByLabel('Note title', { exact: true }).fill('Angular Routing');
      const body = page.getByRole('textbox', { name: 'Note content', exact: true });
      await body.fill('Nested routes keep related views together.');
      await body.press('ControlOrMeta+a');
      await page.getByRole('button', { name: 'Bold', exact: true }).click();
      await expect(body.locator('strong')).toContainText('Nested routes');
      await page.screenshot({
        path: '/tmp/streakly-connected/editor-' + width + '.png',
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Save note', exact: true }).click();
      await expect(
        page.locator('.note-reader strong').filter({ hasText: 'Nested routes' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Edit note', exact: true }).click();
      await expect(
        page.getByRole('textbox', { name: 'Note content', exact: true }).locator('strong'),
      ).toContainText('Nested routes');
      await page.getByRole('button', { name: 'Save note', exact: true }).click();
      await page.reload();
      await page.getByRole('button', { name: /Angular Routing/ }).click();
      await expect(
        page.locator('.note-reader strong').filter({ hasText: 'Nested routes' }),
      ).toBeVisible();
      await page.goto('/journal');
      await page
        .locator('.page-heading')
        .getByRole('button', { name: 'Write an entry', exact: true })
        .click();
      await page
        .getByLabel('Journal content', { exact: true })
        .fill('Today felt steady. I made space for learning and a good conversation.');
      await save(page, 'Save entry');
      await expect(page.locator('.journal-prose')).toContainText('Today felt steady.');
      await page.goto('/planner');
      for (const title of ['One completed task', 'One pending task', 'Another pending task']) {
        await page.getByLabel('What needs doing?', { exact: true }).fill(title);
        await page.getByRole('button', { name: 'Add task', exact: true }).click();
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      }
      await page
        .getByRole('button', { name: 'Complete task: One completed task', exact: true })
        .click();
      await page.goto('/reports');
      await expect(
        page.locator('.daily-counts>div').filter({ hasText: 'Tasks completed' }),
      ).toContainText('1');
      await expect(
        page.locator('.daily-counts>div').filter({ hasText: 'Tasks pending' }),
      ).toContainText('2');
      await expect(
        page.locator('.daily-counts>div').filter({ hasText: 'Tasks missed / overdue' }),
      ).toContainText('0');
      await expect(page.locator('.daily-timeline')).toContainText('One completed task');
      await expect(page.locator('.attention-section')).toContainText('One pending task');
      await expect(page.locator('.daily-timeline')).toContainText('Angular Routing');
      await page.screenshot({
        path: '/tmp/streakly-connected/report-' + width + '.png',
        fullPage: true,
      });
      await page
        .getByRole('button', { name: 'Move to tomorrow: One pending task', exact: true })
        .click();
      await expect(
        page.locator('.daily-counts>div').filter({ hasText: 'Tasks pending' }),
      ).toContainText('1');
      await expect(page.locator('.priorities-grid')).toContainText('One pending task');
      await page.getByRole('button', { name: 'Weekly report', exact: true }).click();
      await expect(page.locator('.period-work-summary')).toBeVisible();
      await page.getByRole('button', { name: 'Monthly report', exact: true }).click();
      await expect(page.locator('.report-finance')).toBeVisible();
    },
  );
}
test('server reports show errors, retry and reload actual MongoDB records without fabricated results', async ({
  page,
}) => {
  await signup(page);
  await page.route('**/api/reports?*', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: { message: 'Report connection unavailable.' } }),
    }),
  );
  await page.goto('/reports');
  await expect(page.getByRole('alert')).toContainText('Report connection unavailable');
  await expect(page.locator('.daily-counts')).not.toBeVisible();
  await page.unroute('**/api/reports?*');
  await page.getByRole('button', { name: 'Retry report', exact: true }).click();
  await expect(page.locator('.daily-counts')).toBeVisible();
});

test('populated details and editors fit all six widths in light and dark modes', async ({
  page,
}) => {
  test.setTimeout(120000);
  await signup(page);
  const session = (await (await page.request.get('/api/auth/session')).json()).data;
  let revision = 0;
  async function add(path: string, record: object) {
    const response = await page.request.post('/api/' + path, {
      headers: { 'X-CSRF-Token': session.csrf },
      data: { expectedRevision: revision, record },
    });
    const body = await response.json();
    expect(response.ok(), JSON.stringify(body)).toBe(true);
    revision = body.data.revision;
  }
  const date = dateKey();
  await add('goals/course', {
    title: 'Complete Angular Course',
    tracking: 'milestones',
    milestones: Array.from({ length: 5 }, (_, i) => ({
      id: 'm' + i,
      title: [
        'Understand reactive state',
        'Build routing exercises',
        'Create accessible forms',
        'Test application behavior',
        'Ship a finished project',
      ][i],
      done: i < 2,
      manualDone: i < 2,
      completedOn: i < 2 ? date : '',
    })),
  });
  await add('jobs/application', {
    company: 'Northstar',
    position: 'Frontend Engineer',
    status: 'Interview',
    notes: 'A thoughtful team building useful products.',
    timeline: [
      {
        id: 'conversation',
        kind: 'note',
        date,
        title: 'Interview invitation',
        note: 'Prepare a small Angular demo.',
      },
    ],
    followUps: [
      { id: 'follow', title: 'Prepare for the interview', date, done: false, completedOn: '' },
    ],
  });
  await add('learning/note', {
    topic: 'A clearer way to learn',
    format: 'html',
    description:
      '<h2>Small, deliberate steps</h2><p>Build a little, <strong>reflect on it</strong>, and make time to return tomorrow.</p><ul><li><p>Practise one idea</p></li><li><p>Write down the lesson</p></li></ul>',
    goalId: 'course',
    minutes: 25,
  });
  await add('journal/entry', {
    content:
      'Today I made room for the work that matters. A short learning session and a useful conversation were enough to move forward.',
  });
  await add('income/pay', { amount: 30000000, source: 'Salary', category: 'Salary' });
  await add('expenses/food', { amount: 3500000, category: 'Food' });
  for (const theme of ['light', 'dark']) {
    const profile = await page.request.patch('/api/profile', {
      headers: { 'X-CSRF-Token': session.csrf },
      data: { expectedRevision: revision, preferences: { theme } },
    });
    const result = await profile.json();
    expect(profile.ok(), JSON.stringify(result)).toBe(true);
    revision = result.data.revision;
    for (const width of [320, 375, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of [
        '/goals/course',
        '/jobs/application',
        '/learning?note=note',
        '/journal',
        '/reports',
        '/finance',
        '/planner',
      ]) {
        await page.goto(path);
        await expect(page.locator('main h1')).toBeVisible();
        if (path === '/reports') await expect(page.locator('.daily-counts')).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          path + ' at ' + width + ' ' + theme,
        ).toBe(true);
        if (path === '/goals/course') {
          await expect(
            page.getByRole('heading', { name: '40% complete', exact: true }),
          ).toBeVisible();
          await page
            .locator('.milestone-row')
            .first()
            .getByRole('button', { name: 'Edit', exact: true })
            .click();
          await expect(page.getByLabel('Milestone title', { exact: true })).toBeVisible();
          await page
            .locator('.inline-form')
            .getByRole('button', { name: 'Cancel', exact: true })
            .click();
        }
        if (path.startsWith('/learning')) {
          await page.getByRole('button', { name: 'Edit note', exact: true }).click();
          await expect(
            page.getByRole('textbox', { name: 'Note content', exact: true }),
          ).toBeVisible();
          await expect(
            page.getByRole('button', { name: 'Save note', exact: true }),
          ).toBeInViewport();
        }
        if (path === '/journal') {
          await page
            .locator('.page-heading')
            .getByRole('button', { name: 'Write an entry', exact: true })
            .click();
          const dialog = page.getByRole('dialog');
          expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
          await dialog
            .getByRole('button', { name: 'Save entry', exact: true })
            .scrollIntoViewIfNeeded();
          await expect(
            dialog.getByRole('button', { name: 'Save entry', exact: true }),
          ).toBeInViewport();
          await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        }
        if (
          [320, 768, 1440].includes(width) &&
          ['/goals/course', '/learning?note=note', '/reports'].includes(path)
        ) {
          await page.evaluate(() => {
            (document.activeElement as HTMLElement)?.blur();
            window.scrollTo(0, 0);
          });
          await page.screenshot({
            path:
              '/tmp/streakly-connected/qa-' +
              path.split('/')[1].split('?')[0] +
              '-' +
              theme +
              '-' +
              width +
              '.png',
          });
        }
      }
    }
  }
});

test('rich-text tools display real headings, lists, checklists, quotes, code and safe links', async ({
  page,
}) => {
  await signup(page);
  await page.goto('/learning');
  const tools = [
    ['Heading', 'h2'],
    ['Bold', 'strong'],
    ['Italic', 'em'],
    ['Bullet list', 'ul:not([data-type]) li'],
    ['Numbered list', 'ol li'],
    ['Checklist', 'ul[data-type="taskList"] li'],
    ['Quote', 'blockquote'],
    ['Inline code', 'code'],
    ['Code block', 'pre code'],
  ];
  for (const [label, selector] of tools) {
    await page.getByRole('button', { name: 'New note', exact: true }).click();
    const body = page.getByRole('textbox', { name: 'Note content', exact: true });
    await body.fill('A useful idea');
    await body.press('ControlOrMeta+a');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(body.locator(selector).first()).toContainText('A useful idea');
    await page.getByRole('button', { name: 'Save note', exact: true }).click();
    await expect(page.locator('.note-reader')).toContainText('A useful idea');
  }
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  const body = page.getByRole('textbox', { name: 'Note content', exact: true });
  await body.fill('A useful link');
  await body.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await page.getByLabel('Link URL', { exact: true }).fill('https://angular.dev/guide/routing');
  await page.getByRole('button', { name: 'Apply link', exact: true }).click();
  await expect(body.locator('a')).toHaveAttribute('href', 'https://angular.dev/guide/routing');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.locator('.note-reader app-markdown a')).toHaveAttribute(
    'href',
    'https://angular.dev/guide/routing',
  );
});
