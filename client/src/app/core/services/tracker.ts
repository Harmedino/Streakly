import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { emptyLife } from '../models/life';
import { Activity, AppData, Todo, emptyData } from '../models/tracker';
import { reconcileAutomation } from '../utils/automation';
import { addDays, todayKey, validDate } from '../utils/dates';
import { syncLearning } from '../utils/learning';
import {
  canFreeze,
  completeOn,
  dueOn,
  isFrozen,
  isPaused,
  isRest,
  orderedActivities,
  stats,
} from '../utils/streaks';
import { reconcileWorkflows } from '../utils/workflows';
import { ApiService } from './api';
import { StorageService, validateData } from './storage';
@Injectable({ providedIn: 'root' })
export class TrackerService {
  readonly api = inject(ApiService);
  readonly storage = inject(StorageService);
  readonly data = signal(this.storage.load());
  readonly today = signal(todayKey(this.data().preferences.timeZone));
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
  private rolloverTimer?: ReturnType<typeof setTimeout>;
  private onReturn = () => {
    if (document.visibilityState !== 'hidden') this.refreshToday();
  };
  refreshToday() {
    this.today.set(todayKey(this.data().preferences.timeZone));
    this.scheduleRollover();
  }
  private scheduleRollover() {
    clearTimeout(this.rolloverTimer);
    const now = new Date(),
      midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    this.rolloverTimer = setTimeout(
      () => this.refreshToday(),
      midnight.getTime() - now.getTime() + 20,
    );
  }
  constructor() {
    effect(() => {
      const server = this.api.snapshot();
      if (server) {
        this.data.set(server);
        this.refreshToday();
      }
    });
    effect(() => {
      if (this.api.enabled()) return;
      const incoming = this.storage.external();
      if (incoming) {
        this.data.set(incoming);
        this.storage.external.set(null);
      }
    });
    this.dayTimer = setInterval(() => this.refreshToday(), 30000);
    this.scheduleRollover();
    window.addEventListener('focus', this.onReturn);
    document.addEventListener('visibilitychange', this.onReturn);
  }
  ngOnDestroy() {
    clearTimeout(this.rolloverTimer);
    clearInterval(this.dayTimer);
    window.removeEventListener('focus', this.onReturn);
    document.removeEventListener('visibilitychange', this.onReturn);
    clearTimeout(this.timer);
  }
  notify(message: string) {
    if (this.api.busy()) {
      void this.api.settled().then((saved) => {
        if (saved) this.notify(message);
      });
      return;
    }
    this.toast.set(message);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.toast.set(''), 4500);
  }
  update(change: (d: AppData) => void): boolean {
    if (this.api.enabled() && (!this.api.user() || this.api.busy())) return false;
    const incoming = this.api.enabled() ? null : this.storage.external();
    if (incoming) {
      this.data.set(incoming);
      this.storage.external.set(null);
      this.notify('Another tab updated your data. Please retry your change.');
      return false;
    }
    const d = structuredClone(this.data());
    try {
      change(d);
      reconcileAutomation(d);
      reconcileWorkflows(d, this.data());
      validateData(d);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Review this change before saving.';
      if (this.api.enabled()) this.api.error.set(message);
      else this.storage.error.set(message);
      this.notify(message);
      return false;
    }
    d.revision = (this.data().revision ?? 0) + 1;
    if (this.api.enabled()) return this.api.write(d, this.data().revision ?? 0);
    if (!this.storage.save(d)) return false;
    this.data.set(d);
    this.refreshToday();
    return true;
  }
  settled() {
    return this.api.enabled() ? this.api.settled() : Promise.resolve(true);
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
    if (
      this.data().life?.learning.some((e) => e.activityId === a.id) &&
      (a.frequency === 'once' || (a.progressType !== 'duration' && a.quantityTarget !== 1))
    ) {
      this.notify(
        'Unlink learning entries before changing this streak to an incompatible progress type.',
      );
      return false;
    }
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
      const linked = d.life?.learningCredits.filter((c) => c.activityId === a.id) ?? [];
      if (linked.length) {
        if (a.progressType !== 'duration')
          for (const credit of linked) credit.baseQuantity = Number(credit.baseQuantity > 0);
        syncLearning(
          d,
          linked.map((c) => ({ activityId: c.activityId, date: c.date })),
        );
      }
    });
    if (saved) this.notify('Activity saved. A little commitment goes a long way.');
    return saved;
  }
  record(a: Activity, date: string, quantity: number, note = '') {
    this.refreshToday();
    if (a.automation) {
      this.notify('Edit the related source record to update an automatic streak.');
      return false;
    }
    if (
      !validDate(date) ||
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
        const credit = d.life?.learningCredits.find(
          (c) => c.activityId === a.id && c.date === date,
        );
        if (credit) {
          const learning = d.life!.learning.filter((e) => e.activityId === a.id && e.date === date);
          const added =
            a.progressType === 'duration'
              ? learning.reduce((n, e) => n + e.minutes, 0)
              : Number(learning.length > 0);
          credit.baseQuantity = Math.max(0, quantity - added);
          credit.baseNote = note;
          quantity = Math.max(quantity, added);
        }
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
  toggle(a: Activity, date?: string) {
    this.refreshToday();
    const chosen = date ?? this.today();
    return this.record(
      a,
      chosen,
      this.completed(a, chosen) ? 0 : a.quantityTarget,
      this.entry(a, chosen)?.note ?? '',
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
      if (d.life) {
        for (const entry of d.life.learning) if (entry.activityId === a.id) entry.activityId = '';
        for (const goal of d.life.goals) if (goal.activityId === a.id) goal.activityId = '';
        d.life.learningCredits = d.life.learningCredits.filter((c) => c.activityId !== a.id);
      }
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
  addTodo(
    title: string,
    dueDate = '',
    scheduledDate = '',
    priority: 'low' | 'medium' | 'high' = 'medium',
    goalId = '',
    milestoneId = '',
    syncMilestone = false,
  ): boolean {
    title = title.trim();
    if (
      !title ||
      title.length > 200 ||
      (dueDate && !validDate(dueDate)) ||
      (scheduledDate && !validDate(scheduledDate))
    )
      return false;
    const now = new Date().toISOString();
    const saved = this.update((d) => {
      d.todos ??= [];
      d.todos.push({
        id: crypto.randomUUID(),
        title,
        dueDate,
        scheduledDate,
        priority,
        goalId,
        milestoneId,
        syncMilestone,
        done: false,
        createdAt: now,
        updatedAt: now,
      });
    });
    if (saved) this.notify('Added to your list. One less thing to remember.');
    return saved;
  }
  editTodo(
    original: Todo,
    title: string,
    dueDate = '',
    scheduledDate = original.scheduledDate ?? '',
    priority = original.priority ?? 'medium',
    goalId = original.goalId ?? '',
    milestoneId = original.milestoneId ?? '',
    syncMilestone = original.syncMilestone ?? false,
  ): boolean {
    title = title.trim();
    if (
      !title ||
      title.length > 200 ||
      (dueDate && !validDate(dueDate)) ||
      (scheduledDate && !validDate(scheduledDate)) ||
      !['low', 'medium', 'high'].includes(priority)
    )
      return false;
    const latest = this.data().todos?.find((t) => t.id === original.id);
    if (!latest || JSON.stringify(latest) !== JSON.stringify(original)) {
      this.notify('This task changed in another tab. Reopen it before editing.');
      return false;
    }
    return this.update((d) => {
      const todo = d.todos!.find((t) => t.id === original.id)!;
      todo.title = title;
      todo.dueDate = dueDate;
      todo.scheduledDate = scheduledDate;
      todo.priority = priority;
      todo.goalId = goalId;
      todo.milestoneId = milestoneId;
      todo.syncMilestone = syncMilestone;
      todo.updatedAt = new Date().toISOString();
    });
  }
  toggleTodo(id: string): boolean {
    if (!this.data().todos?.some((t) => t.id === id)) return false;
    return this.update((d) => {
      const todo = d.todos!.find((t) => t.id === id)!;
      todo.done = !todo.done;
      todo.completedOn = todo.done ? this.today() : '';
      todo.completedAt = todo.done ? new Date().toISOString() : undefined;
      todo.updatedAt = new Date().toISOString();
    });
  }
  deleteTodo(id: string): boolean {
    const saved = this.update((d) => (d.todos = (d.todos ?? []).filter((t) => t.id !== id)));
    if (saved) this.notify('Task removed.');
    return saved;
  }
  clearCompletedTodos(): boolean {
    if (this.api.enabled()) return this.api.clearCompleted(this.data().revision ?? 0);
    return this.update((d) => (d.todos = (d.todos ?? []).filter((t) => !t.done)));
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
  resetSection(section: string): boolean {
    const d = structuredClone(this.data());
    d.life ??= emptyLife();
    const life = d.life;
    if (section === 'all') {
      return this.import(emptyData());
    }
    if (section === 'finance') {
      const fresh = emptyLife();
      life.accounts = [];
      life.transactions = [];
      life.recurring = [];
      life.budgets = [];
      life.savingsGoals = [];
      life.contributions = [];
      life.targets = [];
      life.incomeCategories = fresh.incomeCategories;
      life.expenseCategories = fresh.expenseCategories;
      for (const g of life.goals) g.savingsId = '';
    } else if (section === 'learning') {
      const pairs = life.learningCredits.map((c) => ({ activityId: c.activityId, date: c.date }));
      life.learning = [];
      syncLearning(d, pairs);
      for (const g of life.goals) g.learningCategory = '';
    } else if (section === 'jobs') life.jobs = [];
    else if (section === 'goals') {
      life.goals = [];
      life.goalEvents = [];
    } else if (section === 'journal') {
      life.journal = [];
      d.dailyNotes = {};
    } else if (section === 'planner') d.todos = [];
    else if (section === 'streaks') {
      d.activities = [];
      d.completions = [];
      d.milestones = [];
      life.learningCredits = [];
      for (const e of life.learning) e.activityId = '';
      for (const g of life.goals) g.activityId = '';
    } else if (section !== 'finance') return false;
    reconcileAutomation(d);
    reconcileWorkflows(d, this.data());
    return this.import(d);
  }
  import(raw: unknown) {
    const data = validateData(raw);
    data.revision = (this.data().revision ?? 0) + 1;
    if (this.api.enabled()) return this.api.write(data, this.data().revision ?? 0, true);
    if (this.storage.save(data, true)) {
      this.data.set(data);
      this.notify('Your backup has been restored.');
      return true;
    }
    return false;
  }
}
