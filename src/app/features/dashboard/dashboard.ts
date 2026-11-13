import { RecordFeed } from '../../shared/record-feed';
import { LifeService } from '../../services/life';
import { QuickEntry } from '../../shared/quick-entry';
import { financeTotals, naira } from '../../core/finance';
import { goalProgress } from '../../services/life';
import { monthStart } from '../../core/dates';
import { DailyNote } from '../../shared/daily-note';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TrackerService } from '../../services/tracker';
import { Icon } from '../../shared/icon';
import { ActivityCard } from '../../shared/activity-card';
import { ActivityForm } from '../../shared/activity-form';
import { Calendar } from '../../shared/calendar';
import { EmptyState, Progress } from '../../shared/ui';
import { addDays, prettyDate, weekStart } from '../../core/dates';
import { dailyCounts, rangeScore } from '../../core/insights';
@Component({
  selector: 'app-dashboard',
  imports: [
    RecordFeed,
    QuickEntry,
    DailyNote,
    RouterLink,
    Icon,
    ActivityCard,
    ActivityForm,
    Calendar,
    EmptyState,
    Progress,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  tracker = inject(TrackerService);
  life = inject(LifeService);
  cash = naira;
  quick = signal<'income' | 'expense' | 'learning' | 'progress' | null>(null);
  finance = computed(() =>
    financeTotals(this.life.data(), monthStart(this.tracker.today()), this.tracker.today()),
  );
  learningHours = computed(
    () =>
      Math.round(
        (this.life
          .data()
          .learning.filter(
            (e) => e.date >= weekStart(this.tracker.today()) && e.date <= this.tracker.today(),
          )
          .reduce((n, e) => n + e.minutes, 0) /
          60) *
          10,
      ) / 10,
  );
  monthlyJobs = computed(
    () =>
      this.life
        .data()
        .jobs.filter(
          (j) => j.date >= monthStart(this.tracker.today()) && j.date <= this.tracker.today(),
        ).length,
  );
  activeGoals = computed(() => this.life.data().goals.filter((g) => g.status === 'active').length);
  goalProgress = goalProgress;
  previewGoals = computed(() =>
    this.life
      .data()
      .goals.filter((g) => g.status === 'active')
      .slice(0, 3),
  );
  recentActivity = computed(() =>
    [
      ...this.tracker
        .data()
        .completions.map((c) => ({
          id: 'check:' + c.activityId + c.date,
          title:
            this.tracker.data().activities.find((a) => a.id === c.activityId)?.name || 'Activity',
          date: c.date,
          label: 'Streak check-in',
          icon: 'check',
          path: '/activities/' + c.activityId,
        })),
      ...this.life
        .data()
        .learning.map((e) => ({
          id: 'learn:' + e.id,
          title: e.topic,
          date: e.date,
          label: e.minutes + ' minutes of learning',
          icon: 'sprout',
          path: '/learning',
        })),
      ...this.life
        .data()
        .transactions.map((t) => ({
          id: 'money:' + t.id,
          title: t.source || t.description || t.category,
          date: t.date,
          label: t.kind + ' · ' + naira(t.amount),
          icon: 'chart',
          path: '/finance',
        })),
      ...this.life
        .data()
        .journal.map((j) => ({
          id: 'journal:' + j.id,
          title: 'Daily reflection',
          date: j.date,
          label: 'Personal journal',
          icon: 'leaf',
          path: '/journal',
        })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
  );
  deadlines = computed(() =>
    [
      ...this.life
        .data()
        .goals.filter((g) => g.status === 'active')
        .map((g) => ({ id: g.id, title: g.title, date: g.deadline, path: '/goals' })),
      ...this.life
        .data()
        .savingsGoals.filter(
          (g) =>
            this.life
              .data()
              .contributions.filter((c) => c.goalId === g.id)
              .reduce((n, c) => n + c.amount, 0) < g.target,
        )
        .map((g) => ({ id: g.id, title: g.name, date: g.deadline, path: '/finance' })),
      ...(this.tracker.data().todos ?? [])
        .filter((t) => !t.done && (t.dueDate || t.scheduledDate))
        .map((t) => ({
          id: t.id,
          title: t.title,
          date: t.dueDate || t.scheduledDate!,
          path: '/planner',
        })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5),
  );
  router = inject(Router);
  create = signal(false);
  filter = signal('all');
  pretty = prettyDate;
  progress = computed(() =>
    this.tracker.scheduled().length
      ? Math.round((this.tracker.done() / this.tracker.scheduled().length) * 100)
      : 0,
  );
  activeStreaks = computed(
    () => this.tracker.active().filter((a) => this.tracker.stats(a).current > 0).length,
  );
  best = computed(() =>
    Math.max(0, ...this.tracker.data().activities.map((a) => this.tracker.stats(a).best)),
  );
  weekly = computed(() =>
    rangeScore(this.tracker.data(), weekStart(this.tracker.today()), this.tracker.today()),
  );
  days = computed(() =>
    dailyCounts(
      this.tracker.data(),
      weekStart(this.tracker.today()),
      addDays(weekStart(this.tracker.today()), 6),
    ).map((d) => ({
      ...d,
      label: prettyDate(d.date, { weekday: 'short' }),
      today: d.date === this.tracker.today(),
      future: d.date > this.tracker.today(),
    })),
  );
  max = computed(() => Math.max(3, ...this.days().map((d) => d.count)));
  list = computed(() =>
    this.tracker
      .active()
      .filter(
        (a) =>
          this.filter() === 'all' ||
          (this.tracker.scheduled().some((s) => s.id === a.id) &&
            (this.filter() === 'done') === this.tracker.completed(a)),
      ),
  );
  greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
}
