import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Activity } from '../core/models/tracker';
import { TrackerService } from '../core/services/tracker';
import { MarkStreak } from './components/mark-streak/mark-streak.component';
const a: Activity = {
  id: 'a',
  name: 'Read',
  description: '',
  icon: '📖',
  color: '#57764b',
  category: 'Learning',
  startDate: '2026-10-31',
  frequency: 'daily',
  weekdays: [1],
  periodTarget: 1,
  interval: 1,
  quantityTarget: 1,
  unit: '',
  reminder: '',
  archived: false,
  updatedAt: '',
};
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  TestBed.configureTestingModule({ imports: [MarkStreak] });
});
afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
});
it('keeps the marked control visible but disabled, preserves the entry, and offers separate undo', () => {
  const fixture = TestBed.createComponent(MarkStreak),
    t = TestBed.inject(TrackerService);
  t.saveActivity(a);
  fixture.componentRef.setInput('activity', a);
  fixture.detectChanges();
  const button = () =>
    fixture.nativeElement.querySelector('.mark-streak-button') as HTMLButtonElement;
  expect(button().textContent).toContain('Mark streak');
  expect(button().disabled).toBe(false);
  fixture.componentInstance.mark();
  fixture.detectChanges();
  expect(button().textContent).toContain('Marked');
  expect(button().disabled).toBe(true);
  fixture.componentInstance.mark();
  expect(t.data().completions).toHaveLength(1);
  expect(fixture.nativeElement.textContent).toContain('local midnight');
  fixture.componentInstance.undo();
  fixture.detectChanges();
  expect(button().disabled).toBe(false);
  expect(t.data().completions).toHaveLength(0);
});
it('shows disabled controls and reasons for unavailable activities', () => {
  const fixture = TestBed.createComponent(MarkStreak);
  for (const [activity, reason] of [
    [{ ...a, startDate: '2026-11-02' }, 'Starts'],
    [{ ...a, restDays: ['2026-11-01'] }, 'Planned rest'],
    [{ ...a, pauses: [{ start: '2026-11-01', end: null }] }, 'Paused'],
    [{ ...a, frequency: 'weekdays', weekdays: [1] }, 'Not scheduled'],
  ] as [Activity, string][]) {
    fixture.componentRef.setInput('activity', activity);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.mark-streak-button').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.mark-reason').textContent).toContain(reason);
  }
});
