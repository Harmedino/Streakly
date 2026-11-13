import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LifeService, goalProgress } from '../../services/life';
import { Goal, JobApplication, JournalEntry, LearningEntry } from '../../models/life';
import { EntryForm, FormField, FormValues } from '../../shared/entry-form';
import { ConfirmDialog } from '../../shared/dialog';
import { Calendar } from '../../shared/calendar';
import { EmptyState, Progress } from '../../shared/ui';
import { Icon } from '../../shared/icon';
import { dateKey, monthShift, monthStart, prettyDate, weekStart } from '../../core/dates';
import { savingsProgress } from '../../core/finance';
type Kind = 'learning' | 'jobs' | 'goals' | 'journal';
const f = (
  key: string,
  label: string,
  type: FormField['type'] = 'text',
  required = true,
  extra: Partial<FormField> = {},
): FormField => ({ key, label, type, required, ...extra });
@Component({
  selector: 'app-records',
  imports: [
    FormsModule,
    RouterLink,
    EntryForm,
    ConfirmDialog,
    Calendar,
    EmptyState,
    Progress,
    Icon,
  ],
  templateUrl: './records.html',
})
export class Records {
  life = inject(LifeService);
  tracker = this.life.tracker;
  route = inject(ActivatedRoute);
  kind: Kind = this.route.snapshot.data['kind'];
  pretty = prettyDate;
  goalProgress = goalProgress;
  Math = Math;
  names = {
    learning: 'Learning journal',
    jobs: 'Job applications',
    goals: 'Your goals',
    journal: 'Personal journal',
  };
  taglines = {
    learning: 'A little wiser, one discovery at a time.',
    jobs: 'A simple record of the opportunities you go after.',
    goals: 'Give your intentions somewhere to grow.',
    journal: 'A quiet place to look back, and look ahead.',
  };
  search = signal('');
  filter = signal(this.route.snapshot.queryParamMap.get('category') ?? '');
  dateFilter = signal('');
  editor = signal<{
    id: string;
    title: string;
    fields: FormField[];
    values: FormValues;
    revision: number;
  } | null>(null);
  deleting = signal<{ id: string; title: string } | null>(null);
  learning = computed(() =>
    this.life
      .data()
      .learning.filter(
        (e) =>
          (!this.filter() || e.category === this.filter()) &&
          (!this.dateFilter() || e.date === this.dateFilter()) &&
          (e.topic + ' ' + e.description + ' ' + e.notes)
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  jobs = computed(() =>
    this.life
      .data()
      .jobs.filter(
        (e) =>
          (!this.filter() || e.status === this.filter()) &&
          (e.company + ' ' + e.position + ' ' + e.notes)
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  goals = computed(() =>
    this.life
      .data()
      .goals.filter(
        (g) =>
          (!this.filter() ||
            (this.filter() === 'overdue' &&
              g.status !== 'completed' &&
              g.deadline < this.tracker.today()) ||
            g.status === this.filter()) &&
          (g.title + ' ' + g.description).toLowerCase().includes(this.search().toLowerCase()),
      )
      .sort((a, b) => a.deadline.localeCompare(b.deadline)),
  );
  journal = computed(() =>
    this.life
      .data()
      .journal.filter(
        (e) =>
          (!this.dateFilter() || e.date === this.dateFilter()) &&
          (
            e.accomplished +
            ' ' +
            e.learned +
            ' ' +
            e.challenges +
            ' ' +
            e.ideas +
            ' ' +
            e.improve +
            ' ' +
            e.tomorrow
          )
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  learningCategories = computed(() => [
    ...new Set(this.life.data().learning.map((e) => e.category)),
  ]);
  recordDates = computed(() =>
    (this.kind === 'learning' ? this.life.data().learning : this.life.data().journal).map(
      (e) => e.date,
    ),
  );
  hours(start = '', end = this.tracker.today()) {
    return (
      Math.round(
        (this.life
          .data()
          .learning.filter((e) => e.date >= start && e.date <= end)
          .reduce((n, e) => n + e.minutes, 0) /
          60) *
          10,
      ) / 10
    );
  }
  week = computed(() => weekStart(this.tracker.today()));
  month = computed(() => monthStart(this.tracker.today()));
  jobsThisWeek = computed(
    () =>
      this.life.data().jobs.filter((e) => e.date >= this.week() && e.date <= this.tracker.today())
        .length,
  );
  jobsThisMonth = computed(
    () =>
      this.life.data().jobs.filter((e) => e.date >= this.month() && e.date <= this.tracker.today())
        .length,
  );
  jobTrend = computed(() =>
    Array.from({ length: 6 }, (_, i) => {
      const month = monthShift(this.month(), i - 5).slice(0, 7);
      return { month, count: this.life.data().jobs.filter((j) => j.date.startsWith(month)).length };
    }),
  );
  maxJobs = computed(() => Math.max(1, ...this.jobTrend().map((j) => j.count)));
  categoryHours(category: string) {
    return (
      Math.round(
        (this.life
          .data()
          .learning.filter((e) => e.category === category)
          .reduce((n, e) => n + e.minutes, 0) /
          60) *
          10,
      ) / 10
    );
  }
  urls(value: string) {
    return value.split(/\s+/).filter(Boolean);
  }
  linkedActivity(id: string) {
    return this.tracker.data().activities.find((a) => a.id === id);
  }
  linkedSavings(id: string) {
    return this.life.data().savingsGoals.find((g) => g.id === id);
  }
  goalSavings(id: string) {
    return savingsProgress(this.life.data(), id, this.tracker.today());
  }
  open(record?: LearningEntry | JobApplication | Goal | JournalEntry) {
    this.life.error.set('');
    let fields: FormField[] = [];
    const values: FormValues = {};
    if (record)
      for (const [key, value] of Object.entries(record))
        if (['string', 'number', 'boolean'].includes(typeof value)) values[key] = value;
    values['date'] ??=
      this.dateFilter() && this.dateFilter() <= this.tracker.today()
        ? this.dateFilter()
        : this.tracker.today();
    if (this.kind === 'learning') {
      values['category'] ??= 'Learning';
      values['activityId'] ??= '';
      fields = [
        f('topic', 'Learning topic', 'text', true, { maxLength: 200 }),
        f('description', 'What I learned', 'textarea', true),
        f('category', 'Learning category', 'text', true, { maxLength: 60 }),
        f('minutes', 'Time spent (minutes)', 'number', true, { min: 1, max: 1440, step: 1 }),
        f('date', 'Learning date', 'date', true, { max: this.tracker.today() }),
        f('resources', 'Resource links', 'textarea', false, {
          maxLength: 4000,
          hint: 'HTTP or HTTPS links, separated by spaces or new lines.',
        }),
        f('notes', 'Notes', 'textarea', false),
        f('next', 'What I want to learn next', 'textarea', false, { maxLength: 1000 }),
        f('activityId', 'Contribute to an existing streak', 'select', false, {
          hint: 'Duration streaks receive your minutes. Yes/No streaks receive one completion per day. Multiple entries never create duplicate completion records.',
          options: [
            { value: '', label: 'Do not link a streak' },
            ...this.tracker
              .active()
              .filter(
                (a) =>
                  a.frequency !== 'once' &&
                  (a.progressType === 'duration' || a.quantityTarget === 1),
              )
              .map((a) => ({ value: a.id, label: a.name })),
          ],
        }),
      ];
    }
    if (this.kind === 'jobs') {
      values['status'] ??= 'Applied';
      fields = [
        f('company', 'Company name'),
        f('position', 'Job position'),
        f('date', 'Application date', 'date', true, { max: this.tracker.today() }),
        f('link', 'Job link', 'url', false, { maxLength: 2000 }),
        f('status', 'Application status', 'select', true, {
          options: ['Applied', 'Interview', 'Rejected', 'Offer'].map((value) => ({
            value,
            label: value,
          })),
        }),
        f('notes', 'Application notes', 'textarea', false),
      ];
    }
    if (this.kind === 'goals') {
      const goal = record as Goal | undefined;
      values['category'] ??= 'Personal Development';
      values['priority'] ??= 'medium';
      values['status'] ??= 'active';
      values['progress'] ??= 0;
      values['startDate'] ??= this.tracker.today();
      values['milestones'] = goal?.milestones.map((m) => m.title).join('\n') ?? '';
      values['activityId'] ??= '';
      values['savingsId'] ??= '';
      values['learningCategory'] ??= '';
      fields = [
        f('title', 'Goal title', 'text', true, { maxLength: 200 }),
        f('description', 'Goal description', 'textarea', false),
        f('category', 'Goal category', 'select', true, {
          options: ['Career', 'Finance', 'Learning', 'Health', 'Personal Development', 'Other'].map(
            (value) => ({ value, label: value }),
          ),
        }),
        f('startDate', 'Start date', 'date'),
        f('deadline', 'Deadline', 'date'),
        f('priority', 'Priority', 'select', true, {
          options: ['low', 'medium', 'high'].map((value) => ({ value, label: value })),
        }),
        f('status', 'Goal status', 'select', true, {
          options: ['active', 'completed', 'paused'].map((value) => ({ value, label: value })),
        }),
        f('progress', 'Progress (%)', 'number', true, {
          min: 0,
          max: 100,
          hint: 'If you add milestones, progress is calculated from their completion instead.',
        }),
        f('milestones', 'Milestones · one per line', 'textarea', false, {
          hint: 'Unchanged milestone titles keep their completion history. Marking the goal complete completes all milestones.',
        }),
        f('activityId', 'Related streak', 'select', false, {
          options: [
            { value: '', label: 'None' },
            ...this.tracker.data().activities.map((a) => ({ value: a.id, label: a.name })),
          ],
        }),
        f('savingsId', 'Related savings goal', 'select', false, {
          options: [
            { value: '', label: 'None' },
            ...this.life.data().savingsGoals.map((g) => ({ value: g.id, label: g.name })),
          ],
        }),
        f('learningCategory', 'Related learning category', 'text', false, { maxLength: 60 }),
      ];
    }
    if (this.kind === 'journal') {
      values['mood'] = (record as JournalEntry)?.mood ?? '';
      fields = [
        f('date', 'Reflection date', 'date', true, { max: this.tracker.today() }),
        f('accomplished', 'What I accomplished today', 'textarea', false),
        f('learned', 'What I learned today', 'textarea', false),
        f('challenges', 'Challenges I faced', 'textarea', false),
        f('ideas', 'Ideas', 'textarea', false),
        f('improve', 'What I want to improve', 'textarea', false),
        f('tomorrow', 'Tomorrow’s priorities', 'textarea', false),
        f('mood', 'Mood · optional', 'select', false, {
          options: [
            { value: '', label: 'Prefer not to rate' },
            ...[1, 2, 3, 4, 5].map((n) => ({
              value: String(n),
              label: ['Very low', 'Low', 'Okay', 'Good', 'Great'][n - 1],
            })),
          ],
        }),
      ];
    }
    this.editor.set({
      id: record?.id ?? crypto.randomUUID(),
      title:
        (record ? 'Edit ' : 'Add ') +
        {
          learning: 'learning entry',
          jobs: 'job application',
          goals: 'personal goal',
          journal: 'daily reflection',
        }[this.kind],
      fields,
      values,
      revision: this.tracker.data().revision ?? 0,
    });
  }
  save(v: FormValues) {
    const e = this.editor()!;
    if (e.revision !== (this.tracker.data().revision ?? 0)) {
      this.life.error.set('Data changed while this form was open. Close and reopen it.');
      return;
    }
    const s = (key: string) => String(v[key] ?? '').trim();
    let saved = false;
    if (this.kind === 'learning')
      saved = this.life.saveLearning({
        id: e.id,
        topic: s('topic'),
        description: s('description'),
        category: s('category'),
        minutes: Number(v['minutes']),
        date: s('date'),
        resources: s('resources'),
        notes: s('notes'),
        next: s('next'),
        activityId: s('activityId'),
      });
    if (this.kind === 'jobs')
      saved = this.life.saveJob({
        id: e.id,
        company: s('company'),
        position: s('position'),
        date: s('date'),
        link: s('link'),
        status: s('status') as JobApplication['status'],
        notes: s('notes'),
      });
    if (this.kind === 'journal')
      saved = this.life.saveJournal({
        id: e.id,
        date: s('date'),
        accomplished: s('accomplished'),
        learned: s('learned'),
        challenges: s('challenges'),
        ideas: s('ideas'),
        improve: s('improve'),
        tomorrow: s('tomorrow'),
        mood: s('mood') ? Number(v['mood']) : null,
      });
    if (this.kind === 'goals') {
      const old = this.life.data().goals.find((g) => g.id === e.id),
        titles = s('milestones')
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean);
      if (new Set(titles).size !== titles.length) {
        this.life.error.set('Give each milestone a distinct title.');
        return;
      }
      saved = this.life.saveGoal({
        id: e.id,
        title: s('title'),
        description: s('description'),
        category: s('category'),
        startDate: s('startDate'),
        deadline: s('deadline'),
        priority: s('priority') as Goal['priority'],
        progress: Number(v['progress']),
        status: s('status') as Goal['status'],
        milestones: titles.map(
          (title) =>
            old?.milestones.find((m) => m.title === title) ?? {
              id: crypto.randomUUID(),
              title,
              done: false,
              completedOn: '',
            },
        ),
        activityId: s('activityId'),
        savingsId: s('savingsId'),
        learningCategory: s('learningCategory'),
        updatedOn: this.tracker.today(),
      });
    }
    if (saved) this.editor.set(null);
  }
  ask(id: string, title: string) {
    this.deleting.set({ id, title });
  }
  remove() {
    const d = this.deleting()!;
    const section = this.kind === 'journal' ? 'journal' : this.kind;
    if (this.life.remove(section, d.id)) this.deleting.set(null);
  }
}
