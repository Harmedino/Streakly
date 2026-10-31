import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { ReminderService } from './reminders';
import { TrackerService } from './tracker';
import { Activity } from '../models/tracker';
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  TestBed.configureTestingModule({});
});
afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('uses an in-app fallback, claims reminders once, and respects completion and disable', async () => {
  const t = TestBed.inject(TrackerService),
    r = TestBed.inject(ReminderService);
  const a: Activity = {
    id: 'a',
    name: 'Read',
    description: '',
    icon: '📖',
    color: '#57764b',
    category: 'Learning',
    startDate: '2024-01-01',
    frequency: 'daily',
    weekdays: [1],
    periodTarget: 1,
    interval: 1,
    quantityTarget: 1,
    unit: '',
    reminder: '09:00',
    archived: false,
    updatedAt: '',
  };
  t.today.set('2024-01-01');
  t.saveActivity(a);
  t.update((d) => (d.preferences.remindersEnabled = true));
  await r.check(new Date(2024, 0, 1, 10));
  expect(t.toast()).toContain('A little reminder');
  expect(t.data().reminderLog).toEqual(['a:2024-01-01']);
  t.toast.set('');
  await r.check(new Date(2024, 0, 1, 11));
  expect(t.toast()).toBe('');
  t.record(a, '2024-01-01', 1);
  t.update((d) => (d.reminderLog = []));
  t.toast.set('');
  await r.check(new Date(2024, 0, 1, 12));
  expect(t.toast()).toBe('');
  r.disable();
  expect(t.data().preferences.remindersEnabled).toBe(false);
});
