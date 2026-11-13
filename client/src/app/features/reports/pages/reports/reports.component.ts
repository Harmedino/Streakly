import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LifeService } from '../../../../core/services/life';
import { ReportsService } from '../../../../core/services/reports';
import { ReportBundle, ReportItem } from '../../../../core/utils/daily-report';
import { addDays, monthShift, prettyDate, validDate } from '../../../../core/utils/dates';
import { naira } from '../../../../core/utils/finance';
import { Progress } from '../../../../shared/components/ui/index';
@Component({
  selector: 'app-reports',
  imports: [FormsModule, RouterLink, Progress],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class Reports {
  life = inject(LifeService);
  tracker = this.life.tracker;
  route = inject(ActivatedRoute);
  reports = inject(ReportsService);
  date = signal(this.route.snapshot.queryParamMap.get('date') || this.tracker.today());
  bundle = signal<ReportBundle | null>(null);
  loading = signal(false);
  error = signal('');
  private request = 0;
  period = signal<'day' | 'week' | 'month'>('day');
  pretty = prettyDate;
  Math = Math;
  cash = (amount: number) => naira(amount, this.tracker.data().preferences.currency);
  range = computed(() => this.bundle()!.range);
  end = computed(() => this.bundle()!.end);
  summary = computed(() => this.bundle()!.summary);
  previous = computed(() => this.bundle()!.previous);
  categories = computed(() => this.bundle()!.categories);
  constructor() {
    effect(() => {
      this.tracker.data().revision;
      const period = this.period(),
        date = this.date();
      void this.load(period, date);
    });
  }
  async load(period = this.period(), date = this.date()) {
    const id = ++this.request;
    this.loading.set(true);
    this.bundle.set(null);
    this.error.set('');
    try {
      const result = await this.reports.get(period, date);
      if (id === this.request) this.bundle.set(result);
    } catch (e) {
      if (id === this.request) {
        this.error.set(e instanceof Error ? e.message : 'Could not load this report.');
        this.bundle.set(null);
      }
    } finally {
      if (id === this.request) this.loading.set(false);
    }
  }
  navigate(direction: number) {
    this.date.set(
      this.period() === 'month'
        ? monthShift(this.date(), direction)
        : addDays(this.date(), direction * (this.period() === 'week' ? 7 : 1)),
    );
  }
  async tomorrow(item: ReportItem) {
    const task = this.tracker.data().todos?.find((t) => t.id === item.taskId);
    if (!task) return;
    const date = addDays(this.tracker.today(), 1);
    if (!(
      this.tracker.editTodo(
        task,
        task.title,
        task.dueDate && task.dueDate < date ? date : task.dueDate,
        date,
      ) && (await this.tracker.settled())
    ))
      this.error.set(this.tracker.api.error() || 'Could not move the task.');
  }
  setDate(value: string) {
    if (validDate(value)) this.date.set(value);
  }
}
