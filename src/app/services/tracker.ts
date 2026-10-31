import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Activity, AppData } from '../models/tracker';
import { StorageService, validateData } from './storage';
import { addDays, dateKey, validDate } from '../core/dates';
import {
  canFreeze,
  completeOn,
  dueOn,
  isPaused,
  isRest,
  isFrozen,
  orderedActivities,
  stats,
} from '../core/streaks';
@Injectable({ providedIn: 'root' })
export class TrackerService {
  readonly storage = inject(StorageService);
  readonly data = signal(this.storage.load());
  readonly today = signal(dateKey());
  readonly toast = signal('');
  readonly active = computed(() =>
    orderedActivities(this.data().activities.filter((a) => !a.archived)),
  );
  readonly scheduled = computed(() =>
    this.active().filter((a) => dueOn(a, this.data().completions, this.today())),
  );
  readonly done = computed(() => this.scheduled().filter((a) => this.completed(a)).length);
  private timer?: ReturnType<typeof setTimeout>;
  private dayTimer: ReturnType<typeof setInterval>;
  constructor() {
    effect(() => {
      const incoming = this.storage.external();
      if (incoming) {
        this.data.set(incoming);
        this.storage.external.set(null);
      }
    });
    this.dayTimer = setInterval(() => this.today.set(dateKey()), 30000);
  }
  ngOnDestroy() {
    clearInterval(this.dayTimer);
    clearTimeout(this.timer);
  }
  notify(message: string) {
    this.toast.set(message);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.toast.set(''), 4500);
  }
  update(change: (d: AppData) => void): boolean {
    const incoming = this.storage.external();
    if (incoming) {
      this.data.set(incoming);
      this.storage.external.set(null);
      this.notify('Another tab updated your data. Please retry your change.');
      return false;
    }
    const d = structuredClone(this.data());
    change(d);
    d.revision = (this.data().revision ?? 0) + 1;
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
  addCategory(value: string): boolean {
    const name = value.trim();
    if (!name || name.length > 60) return false;
    if (this.data().categories.some((c) => c.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      this.notify('That category is already in your collection.');
      return false;
    }
    const saved = this.update((d) => d.categories.push(name));
    if (saved) this.notify('Your new category is ready to use.');
    return saved;
  }
  renameCategory(previous: string, value: string): boolean {
    const name = value.trim();
    if (!name || name.length > 60 || !this.data().categories.includes(previous)) return false;
    if (
      this.data().categories.some(
        (c) => c !== previous && c.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      this.notify('Choose a different name. That category already exists.');
      return false;
    }
    const saved = this.update((d) => {
      d.categories = d.categories.map((c) => (c === previous ? name : c));
      for (const a of d.activities) if (a.category === previous) a.category = name;
    });
    if (saved) this.notify('Category updated everywhere. Your history stays just as it is.');
    return saved;
  }
  saveActivity(a: Activity): boolean {
    const existing = this.data().categories.find(
      (c) => c.toLocaleLowerCase() === a.category.trim().toLocaleLowerCase(),
    );
    a = { ...a, category: existing ?? a.category.trim() };
    const saved = this.update((d) => {
      const i = d.activities.findIndex((x) => x.id === a.id);
      if (i < 0) {
        a.order ??=
          Math.max(
            -1,
            ...d.activities.filter((x) => !!x.pinned === !!a.pinned).map((x) => x.order ?? 0),
          ) + 1;
        d.activities.push(a);
      } else d.activities[i] = a;
      if (!d.categories.includes(a.category)) d.categories.push(a.category);
    });
    if (saved) this.notify('Activity saved. A little commitment goes a long way.');
    return saved;
  }
  record(a: Activity, date: string, quantity: number, note = '') {
    if (
      date > this.today() ||
      date < a.startDate ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      quantity > 1000000
    )
      return false;
    if (
      a.frequency === 'once' &&
      quantity >= a.quantityTarget &&
      this.data().completions.some(
        (e) => e.activityId === a.id && e.date !== date && e.quantity >= a.quantityTarget,
      )
    ) {
      this.notify('This one-time goal is already complete. Edit its recorded moment in Calendar.');
      return false;
    }
    if (
      quantity > 0 &&
      ((isPaused(a, date) && !this.entry(a, date)) || isRest(a, date) || isFrozen(a, date))
    ) {
      this.notify('Remove this day’s pause, rest or freeze before recording progress.');
      return false;
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
      return false;
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
    return true;
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
    const saved = this.update((d) => {
      const x = d.activities.find((x) => x.id === a.id)!;
      x.archived = !x.archived;
    });
    if (saved)
      this.notify(a.archived ? 'Activity restored.' : 'Activity archived. Your history is safe.');
    return saved;
  }
  delete(a: Activity) {
    const saved = this.update((d) => {
      d.activities = d.activities.filter((x) => x.id !== a.id);
      d.completions = d.completions.filter((x) => x.activityId !== a.id);
      d.milestones = d.milestones.filter((x) => !x.startsWith(a.id + ':'));
    });
    if (saved) this.notify('Activity deleted.');
    return saved;
  }
  pause(a: Activity) {
    const open = (a.pauses ?? []).find((p) => p.end === null);
    if (
      this.update((d) => {
        const item = d.activities.find((x) => x.id === a.id)!;
        item.pauses ??= [];
        if (open) {
          const p = item.pauses.find((p) => p.end === null)!;
          if (p.start >= this.today()) item.pauses = item.pauses.filter((x) => x !== p);
          else p.end = addDays(this.today(), -1);
        } else
          item.pauses.push({
            start: this.today() < a.startDate ? a.startDate : this.today(),
            end: null,
          });
      })
    )
      this.notify(
        open
          ? 'Activity resumed. Welcome back.'
          : 'Paused. These days will not break or grow your streak.',
      );
  }
  rest(a: Activity, date: string) {
    if (!validDate(date) || date < a.startDate) return;
    if (this.entry(a, date) || isFrozen(a, date)) {
      this.notify('Remove recorded progress or the freeze before planning rest.');
      return;
    }
    if (
      this.update((d) => {
        const x = d.activities.find((x) => x.id === a.id)!;
        x.restDays = isRest(x, date)
          ? x.restDays!.filter((day) => day !== date)
          : [...(x.restDays ?? []), date];
      })
    )
      this.notify('Rest schedule updated. Rest days do not grow or break your streak.');
  }
  freeze(a: Activity, date: string) {
    if (!canFreeze(a, this.data().completions, date, this.today())) {
      this.notify(
        'Freeze a past missed scheduled day. Each activity has two freezes per calendar month.',
      );
      return;
    }
    if (
      this.update((d) => {
        const x = d.activities.find((x) => x.id === a.id)!;
        x.freezes = [...(x.freezes ?? []), date];
      })
    )
      this.notify('Streak protected. A freeze preserves your run without increasing it.');
  }
  unfreeze(a: Activity, date: string) {
    this.update((d) => {
      const x = d.activities.find((x) => x.id === a.id)!;
      x.freezes = (x.freezes ?? []).filter((day) => day !== date);
    });
  }
  pin(a: Activity) {
    this.update((d) => {
      const x = d.activities.find((x) => x.id === a.id)!;
      x.pinned = !x.pinned;
    });
  }
  move(a: Activity, direction: number) {
    const group = orderedActivities(this.active().filter((x) => !!x.pinned === !!a.pinned));
    const i = group.findIndex((x) => x.id === a.id);
    const j = i + direction;
    if (j < 0 || j >= group.length) return;
    [group[i], group[j]] = [group[j], group[i]];
    this.update((d) => {
      for (const [order, item] of group.entries())
        d.activities.find((x) => x.id === item.id)!.order = order;
    });
  }
  dailyNote(date: string, note: string) {
    if (validDate(date) && note.length <= 1000)
      return this.update((d) => {
        d.dailyNotes ??= {};
        if (note.trim()) d.dailyNotes[date] = note;
        else delete d.dailyNotes[date];
      });
    return false;
  }
  import(raw: unknown) {
    const data = validateData(raw);
    data.revision = (this.data().revision ?? 0) + 1;
    if (this.storage.save(data, true)) {
      this.data.set(data);
      this.notify('Your backup has been restored.');
      return true;
    }
    return false;
  }
}
