import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../app';
import { User, Session, Workspace } from '../models/index';
import { Backup } from './workspace';
import { emptyData, Activity } from '../../src/app/models/tracker';
import { dateKey, addDays } from '../../src/app/core/dates';
import { testMail } from './auth';
before(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/streakly_api_test');
  await mongoose.connection.dropDatabase();
  await Promise.all([
    User.syncIndexes(),
    Session.syncIndexes(),
    Workspace.syncIndexes(),
    Backup.syncIndexes(),
  ]);
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const password = 'correct-horse-streakly-2026';
async function account(email: string) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/signup').send({ email, password });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return { agent, csrf: response.body.data.csrf };
}
const write = (
  client: Awaited<ReturnType<typeof account>>,
  path: string,
  body: object,
  method: 'put' | 'post' | 'delete' = 'post',
) =>
  client.agent[method]('/api' + path)
    .set('X-CSRF-Token', client.csrf)
    .send(body);
async function state(client: Awaited<ReturnType<typeof account>>) {
  return (await client.agent.get('/api/workspace')).body.data;
}
test('authentication, user isolation, secure cookies, CSRF and session invalidation', async () => {
  const a = await account('a@example.com'),
    b = await account('b@example.com');
  const unauth = await request(app).get('/api/workspace');
  assert.equal(unauth.status, 401);
  const csrf = await a.agent.put('/api/workspace').send({ expectedRevision: 0, data: emptyData() });
  assert.equal(csrf.status, 403);
  const cookie = (await a.agent.get('/api/auth/session')).body.data;
  assert.equal(cookie.user.email, 'a@example.com');
  const d = await state(a);
  d.preferences.name = 'Private A';
  const saved = await write(a, '/workspace', { expectedRevision: d.revision, data: d }, 'put');
  assert.equal(saved.status, 200);
  assert.equal((await state(b)).preferences.name, '');
  assert.equal((await write(a, '/workspace', { expectedRevision: 0, data: d }, 'put')).status, 409);
  assert.equal((await write(a, '/auth/logout', {})).status, 200);
  assert.equal((await a.agent.get('/api/workspace')).status, 401);
  assert.equal(
    (await a.agent.post('/api/auth/login').send({ email: 'a@example.com', password })).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://evil.example')
        .send({ email: 'a@example.com', password })
    ).status,
    403,
  );
});
test('minimal optional learning records save without URL, time or an activity link; malformed links are explained', async () => {
  const a = await account('notes@example.com');
  const note = await write(a, '/learning/note', {
    expectedRevision: 0,
    record: { description: '## Today\nI learned **signals**.' },
  });
  assert.equal(note.status, 200, JSON.stringify(note.body));
  assert.equal(note.body.data.life.learning[0].minutes, 0);
  assert.equal(note.body.data.life.learning[0].resources, '');
  assert.equal(note.body.data.life.learning[0].activityId, '');
  assert.equal(
    (
      await write(
        a,
        '/learning/note',
        {
          expectedRevision: 1,
          record: { description: 'Revised', resources: 'javascript:alert(1)' },
        },
        'put',
      )
    ).status,
    422,
  );
  const edit = await write(
    a,
    '/learning/note',
    { expectedRevision: 1, record: { description: 'Updated content' } },
    'put',
  );
  assert.equal(edit.status, 200);
  assert.equal((await a.agent.get('/api/learning?limit=1')).body.meta.total, 1);
  const draft = await write(
    a,
    '/drafts/learning',
    { title: 'Draft', content: 'Keep writing', epoch: 0 },
    'put',
  );
  assert.equal(draft.status, 200);
  assert.equal((await a.agent.get('/api/drafts/learning')).body.data.content, 'Keep writing');
});
test('browser migration is confirmed, backed up, date-preserving, atomic, idempotent and rejects conflicts', async () => {
  const a = await account('migration@example.com');
  const raw = emptyData();
  raw.preferences.name = 'Legacy';
  raw.life!.learning = [
    {
      id: 'old-note',
      topic: 'Original',
      description: 'Keep this',
      category: '',
      minutes: 0,
      date: '2024-02-29',
      resources: '',
      notes: '',
      next: '',
      activityId: '',
    },
  ];
  const before = JSON.stringify(raw);
  const preview = await write(a, '/migration/preview', { data: raw });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.equal(preview.body.data.counts.learning, 1);
  assert.equal(
    (await write(a, '/migration', { expectedRevision: 0, data: raw, confirm: false })).status,
    422,
  );
  const first = await write(a, '/migration', { expectedRevision: 0, data: raw, confirm: true });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.data.life.learning[0].date, '2024-02-29');
  const again = await write(a, '/migration', { expectedRevision: 0, data: raw, confirm: true });
  assert.equal(again.status, 200);
  assert.equal(again.body.data.life.learning.length, 1);
  assert.equal(JSON.stringify(raw), before);
  assert.equal((await a.agent.get('/api/backup/previous')).status, 200);
});
test('automatic streaks are idempotent and reconcile note edits and deletion while preserving manual base', async () => {
  const a = await account('auto@example.com');
  const d = await state(a),
    today = dateKey();
  const habit: Activity = {
    id: 'auto',
    name: 'Learning',
    description: '',
    icon: '📖',
    color: '#8270b2',
    category: 'Learning',
    startDate: addDays(today, -3),
    frequency: 'daily',
    weekdays: [1],
    periodTarget: 1,
    interval: 1,
    quantityTarget: 1,
    progressType: 'binary',
    unit: '',
    reminder: '',
    archived: false,
    updatedAt: new Date().toISOString(),
    automation: { trigger: 'learning', minimum: 0 },
  };
  d.activities = [habit];
  assert.equal((await write(a, '/workspace', { expectedRevision: 0, data: d }, 'put')).status, 200);
  const added = await write(a, '/learning/note', {
    expectedRevision: 1,
    record: { description: 'A note is enough' },
  });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.equal(added.body.data.completions.length, 1);
  const edited = await write(
    a,
    '/learning/note',
    { expectedRevision: 2, record: { description: 'Changed my note' } },
    'put',
  );
  assert.equal(edited.body.data.completions.length, 1);
  const removed = await write(
    a,
    '/learning/note',
    { expectedRevision: 3, confirm: true },
    'delete',
  );
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.completions.length, 0);
  const restored = await write(
    a,
    '/workspace',
    { expectedRevision: 4, data: edited.body.data, backup: true },
    'put',
  );
  assert.equal(restored.status, 200, JSON.stringify(restored.body));
  assert.equal(restored.body.data.completions.length, 1);
  const removedAgain = await write(
    a,
    '/learning/note',
    { expectedRevision: 5, confirm: true },
    'delete',
  );
  assert.equal(removedAgain.status, 200);
  assert.equal(removedAgain.body.data.completions.length, 0);
});
test('finance funding does not assume salary, split allocations cannot double-spend and balances remain exact', async () => {
  const a = await account('finance@example.com'),
    d = await state(a),
    date = dateKey();
  d.life.accounts = [
    { id: 'bank', name: 'Bank', type: 'bank', openingBalance: 10000000, openingDate: date },
  ];
  d.life.transactions = [
    {
      id: 'salary',
      kind: 'income',
      amount: 30000000,
      date,
      source: 'Employer',
      category: 'Salary',
      description: '',
      accountId: 'bank',
      toAccountId: '',
    },
    {
      id: 'side',
      kind: 'income',
      amount: 10000000,
      date,
      source: 'Freelance',
      category: 'Freelancing',
      description: '',
      accountId: '',
      toAccountId: '',
    },
    {
      id: 'food',
      kind: 'expense',
      amount: 5000000,
      date,
      source: '',
      category: 'Food',
      description: '',
      accountId: 'bank',
      toAccountId: '',
      funding: [
        { incomeId: 'salary', amount: 3000000 },
        { incomeId: 'side', amount: 2000000 },
      ],
    },
  ];
  const result = await write(a, '/workspace', { expectedRevision: 0, data: d }, 'put');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const bad = structuredClone(result.body.data);
  bad.life.transactions[2].funding[0].amount = 30000001;
  assert.equal(
    (await write(a, '/workspace', { expectedRevision: 1, data: bad }, 'put')).status,
    422,
  );
  const report = await a.agent.get(`/api/reports?from=${date}&to=${date}`);
  assert.equal(report.body.data.income, 40000000);
  assert.equal(report.body.data.expenses, 5000000);
  assert.equal(report.body.data.available, 35000000);
});
test('section and full resets require confirmation, preserve unrelated records, retain backups and reject stale writes', async () => {
  const a = await account('reset@example.com');
  const note = await write(a, '/learning/keep', {
    expectedRevision: 0,
    record: { description: 'Keep me' },
  });
  assert.equal(note.status, 200);
  assert.equal(
    (await write(a, '/reset', { expectedRevision: 1, section: 'all', confirm: true })).status,
    422,
  );
  const finance = await write(a, '/reset', {
    expectedRevision: 1,
    section: 'finance',
    confirm: true,
  });
  assert.equal(finance.status, 200);
  assert.equal(finance.body.data.life.learning.length, 1);
  assert.equal(
    (
      await write(a, '/reset', {
        expectedRevision: 1,
        section: 'all',
        confirm: true,
        typed: 'RESET',
      })
    ).status,
    409,
  );
  const reset = await write(a, '/reset', {
    expectedRevision: 2,
    section: 'all',
    confirm: true,
    typed: 'RESET',
  });
  assert.equal(reset.status, 200);
  assert.equal(reset.body.data.life.learning.length, 0);
  const backup = await a.agent.get('/api/backup/previous');
  assert.equal(backup.body.data.life.learning.length, 1);
});
test('password reset tokens are single-use, delivered only by mail and revoke existing sessions', async () => {
  const a = await account('password@example.com');
  const response = await a.agent
    .post('/api/auth/forgot-password')
    .send({ email: 'password@example.com' });
  assert.equal(response.status, 202);
  assert.equal(JSON.stringify(response.body).includes('token'), false);
  const token = new URL(testMail.at(-1)!.url).searchParams.get('reset');
  const updated = await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: 'new-strong-password-2026' });
  assert.equal(updated.status, 200);
  assert.equal((await a.agent.get('/api/workspace')).status, 401);
  assert.equal(
    (await request(app).post('/api/auth/reset-password').send({ token, password })).status,
    400,
  );
  assert.equal(
    (
      await a.agent
        .post('/api/auth/login')
        .send({ email: 'password@example.com', password: 'new-strong-password-2026' })
    ).status,
    200,
  );
});

test('full reset invalidates draft epochs and bulk workspace replacement cannot bypass confirmation', async () => {
  const a = await account('draft-reset@example.com');
  await write(a, '/learning/one', { expectedRevision: 0, record: { description: 'One' } });
  await write(a, '/learning/two', { expectedRevision: 1, record: { description: 'Two' } });
  const empty = emptyData();
  assert.equal(
    (await write(a, '/workspace', { expectedRevision: 2, data: empty }, 'put')).status,
    422,
  );
  assert.equal(
    (
      await write(
        a,
        '/drafts/learning',
        { epoch: 0, title: 'Draft', content: 'Do not resurrect me' },
        'put',
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await write(a, '/reset', {
        expectedRevision: 2,
        section: 'all',
        confirm: true,
        typed: 'RESET',
      })
    ).status,
    200,
  );
  const draft = (await a.agent.get('/api/drafts/learning')).body.data;
  assert.equal(draft.content, '');
  assert.equal(draft.epoch, 1);
  assert.equal(
    (await write(a, '/drafts/learning', { epoch: 0, title: 'Stale', content: 'Old tab' }, 'put'))
      .status,
    409,
  );
});
test('only one concurrent revision write succeeds', async () => {
  const a = await account('concurrent@example.com');
  const one = await state(a),
    two = structuredClone(one);
  one.preferences.name = 'First';
  two.preferences.name = 'Second';
  const results = await Promise.all([
    write(a, '/workspace', { expectedRevision: 0, data: one }, 'put'),
    write(a, '/workspace', { expectedRevision: 0, data: two }, 'put'),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await state(a)).revision, 1);
});
