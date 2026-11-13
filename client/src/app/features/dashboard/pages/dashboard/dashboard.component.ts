import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Goal } from '../../../../core/models/life';
import { LifeService, goalProgress } from '../../../../core/services/life';
import { TrackerService } from '../../../../core/services/tracker';
import { ReportItem, dailyReport } from '../../../../core/utils/daily-report';
import { addDays, monthStart, prettyDate, weekStart } from '../../../../core/utils/dates';
import { financeTotals, naira } from '../../../../core/utils/finance';
import { dailyCounts, rangeScore } from '../../../../core/utils/insights';
import { goalTracking } from '../../../../core/utils/workflows';
import { ActivityCard } from '../../../../shared/components/activity-card/activity-card.component';
import { ActivityForm } from '../../../../shared/components/activity-form/activity-form.component';
import { Calendar } from '../../../../shared/components/calendar/calendar.component';
import { DailyFocus } from '../../../../shared/components/daily-focus/daily-focus.component';
import { DailyNote } from '../../../../shared/components/daily-note/daily-note.component';
import { Dialog } from '../../../../shared/components/dialog/dialog.component';
import { Icon } from '../../../../shared/components/icon/icon.component';
import { LearningEditor } from '../../../../shared/components/learning-editor/learning-editor.component';
import { QuickEntry } from '../../../../shared/components/quick-entry/quick-entry.component';
import { RecordFeed } from '../../../../shared/components/record-feed/record-feed.component';
import { EmptyState, Progress } from '../../../../shared/components/ui/index';
import { GoalsService } from '../../../goals/services/goals.service';
@Component({
  selector: 'app-dashboard',
  imports: [
    DailyFocus,
    FormsModule,
    Dialog,
    LearningEditor,
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
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class Dashboard {
  tracker = inject(TrackerService);
  life = inject(LifeService);
  cash = (amount: number) => naira(amount, this.tracker.data().preferences.currency);
  goalsService = inject(GoalsService);
  numericGoal = signal<Goal | null>(null);
  numericValue = 0;
  newTask = '';
  actionError = signal('');
  day = computed(() =>
    dailyReport(this.tracker.data(), this.tracker.today(), this.tracker.today()),
  );
  attention = computed(() => this.day().attention.filter((item) => item.kind !== 'Streak'));
  todayTasks = computed(() =>
    (this.tracker.data().todos ?? []).filter(
      (t) => (t.scheduledDate || t.dueDate) === this.tracker.today(),
    ),
  );
  focusTotal = computed(() => this.tracker.scheduled().length + this.todayTasks().length);
  focusDone = computed(() => this.tracker.done() + this.todayTasks().filter((t) => t.done).length);
  upcomingFollowUps = computed(() =>
    this.life
      .data()
      .jobs.flatMap((j) =>
        (j.followUps ?? [])
          .filter((f) => !f.done && f.date > this.tracker.today())
          .map((f) => ({ ...f, jobId: j.id, company: j.company })),
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3),
  );
  latestNotes = computed(() =>
    [...this.life.data().learning].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
  );
  tracking = goalTracking;
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
      ...this.tracker.data().completions.map((c) => ({
        id: 'check:' + c.activityId + c.date,
        title:
          this.tracker.data().activities.find((a) => a.id === c.activityId)?.name || 'Activity',
        date: c.date,
        label: 'Streak check-in',
        icon: 'check',
        path: '/activities/' + c.activityId,
      })),
      ...this.life.data().learning.map((e) => ({
        id: 'learn:' + e.id,
        title: e.topic,
        date: e.date,
        label: e.minutes + ' minutes of learning',
        icon: 'sprout',
        path: '/learning',
      })),
      ...this.life.data().transactions.map((t) => ({
        id: 'money:' + t.id,
        title: t.source || t.description || t.category,
        date: t.date,
        label: t.kind + ' · ' + this.cash(t.amount),
        icon: 'chart',
        path: '/finance',
      })),
      ...this.life.data().journal.map((j) => ({
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
        .goals.filter((g) => g.status === 'active' && !!g.deadline)
        .map((g) => ({ id: g.id, title: g.title, date: g.deadline, path: '/goals' })),
      ...this.life
        .data()
        .savingsGoals.filter(
          (g) =>
            !!g.deadline &&
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
    this.focusTotal() ? Math.round((this.focusDone() / this.focusTotal()) * 100) : 0,
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
  async action(saved: boolean) {
    if (saved && (await this.tracker.settled())) {
      this.actionError.set('');
      return true;
    }
    this.actionError.set(
      this.life.error() || this.tracker.api.error() || 'Could not save. Please retry.',
    );
    return false;
  }
  async completeItem(item: ReportItem) {
    if (item.taskId) await this.action(this.tracker.toggleTodo(item.taskId));
    else if (item.followUpId) {
      const job = structuredClone(this.life.data().jobs.find((j) => j.id === item.jobId)!);
      const f = job.followUps!.find((f) => f.id === item.followUpId)!;
      f.done = true;
      f.completedOn = this.tracker.today();
      await this.action(this.life.saveJob(job));
    }
  }
  async addTask() {
    if (!this.newTask.trim()) return;
    if (await this.action(this.tracker.addTodo(this.newTask, '', this.tracker.today())))
      this.newTask = '';
  }
  openProgress(goal: Goal) {
    this.numericValue = goal.current ?? goal.progress;
    this.numericGoal.set(goal);
  }
  async saveGoalProgress() {
    if (
      await this.action(
        this.life.saveGoal({ ...this.numericGoal()!, current: Number(this.numericValue) }),
      )
    )
      this.numericGoal.set(null);
  }
  greeting() {
    const h = Number(
      new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: this.tracker.data().preferences.timeZone,
      }).format(new Date()),
    );
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
}
