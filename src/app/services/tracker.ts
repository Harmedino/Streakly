import { computed, inject, Injectable, signal } from '@angular/core';
import { Activity, AppData } from '../models/tracker';
import { StorageService, validateData } from './storage';
import { dateKey } from '../core/dates';
import { completeOn, dueOn, stats } from '../core/streaks';
@Injectable({ providedIn: 'root' })
export class TrackerService {
  readonly storage = inject(StorageService);
  readonly data = signal(this.storage.load());
  readonly today = signal(dateKey());
  readonly toast = signal('');
  readonly active = computed(() => this.data().activities.filter((a) => !a.archived));
  readonly scheduled = computed(() =>
    this.active().filter((a) => dueOn(a, this.data().completions, this.today())),
  );
  readonly done = computed(() => this.scheduled().filter((a) => this.completed(a)).length);
  private timer?: ReturnType<typeof setTimeout>;
  constructor() {
    setInterval(() => this.today.set(dateKey()), 30000);
  }
  notify(message: string) {
    this.toast.set(message);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.toast.set(''), 4500);
  }
  update(change: (d: AppData) => void): boolean {
    const d = structuredClone(this.data());
    change(d);
    if (!this.storage.save(d)) return false;
    this.data.set(d);
    return true;
  }
  completed(a: Activity, date = this.today()) {
    return completeOn(a, this.data().completions, date);
  }
  entry(a: Activity, date = this.today()) {
    return this.data().completions.find((e) => e.activityId === a.id && e.date === date);
  }
  stats(a: Activity) {
    return stats(a, this.data().completions, this.today());
  }
  saveActivity(a: Activity) {
    if (
      this.update((d) => {
        const i = d.activities.findIndex((x) => x.id === a.id);
        if (i < 0) d.activities.push(a);
        else d.activities[i] = a;
        if (!d.categories.includes(a.category)) d.categories.push(a.category);
      })
    )
      this.notify('Activity saved. A little commitment goes a long way.');
  }
  record(a: Activity, date: string, quantity: number, note = '') {
    if (
      date > this.today() ||
      date < a.startDate ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      quantity > 1000000
    )
      return;
    if (
      a.frequency === 'once' &&
      quantity >= a.quantityTarget &&
      this.data().completions.some(
        (e) => e.activityId === a.id && e.date !== date && e.quantity >= a.quantityTarget,
      )
    ) {
      this.notify('This one-time goal is already complete. Edit its recorded moment in Calendar.');
      return;
    }
    const before = this.stats(a).current;
    if (
      !this.update((d) => {
        d.completions = d.completions.filter((e) => !(e.activityId === a.id && e.date === date));
        if (quantity > 0) d.completions.push({ activityId: a.id, date, quantity, note });
        const item = d.activities.find((x) => x.id === a.id);
        if (item) item.updatedAt = new Date().toISOString();
      })
    )
      return;
    const after = this.stats(a).current;
    const key = a.id + ':' + after;
    if (
      after > before &&
      [3, 7, 14, 30, 50, 100, 365].includes(after) &&
      !this.data().milestones.includes(key)
    ) {
      this.update((d) => d.milestones.push(key));
      this.notify(`✦ ${after} successful periods! Look at you growing.`);
    } else
      this.notify(
        quantity >= a.quantityTarget
          ? 'A little progress. A stronger you. ✓'
          : quantity > 0
            ? 'Progress saved. Keep going!'
            : 'Completion undone.',
      );
  }
  toggle(a: Activity, date = this.today()) {
    this.record(
      a,
      date,
      this.completed(a, date) ? 0 : a.quantityTarget,
      this.entry(a, date)?.note ?? '',
    );
  }
  archive(a: Activity) {
    this.update((d) => {
      const x = d.activities.find((x) => x.id === a.id)!;
      x.archived = !x.archived;
    });
    this.notify(a.archived ? 'Activity restored.' : 'Activity archived. Your history is safe.');
  }
  delete(a: Activity) {
    this.update((d) => {
      d.activities = d.activities.filter((x) => x.id !== a.id);
      d.completions = d.completions.filter((x) => x.activityId !== a.id);
      d.milestones = d.milestones.filter((x) => !x.startsWith(a.id + ':'));
    });
    this.notify('Activity deleted.');
  }
  import(raw: unknown) {
    const data = validateData(raw);
    if (this.storage.save(data, true)) {
      this.data.set(data);
      this.notify('Your backup has been restored.');
      return true;
    }
    return false;
  }
}
