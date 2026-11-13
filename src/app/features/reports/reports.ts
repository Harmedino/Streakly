import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LifeService } from '../../services/life';
import { lifeReport, previousRange, reportRange } from '../../core/life-reports';
import { groupMoney, naira } from '../../core/finance';
import { prettyDate, validDate } from '../../core/dates';
import { Progress } from '../../shared/ui';
@Component({
  selector: 'app-reports',
  imports: [FormsModule, RouterLink, Progress],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  life = inject(LifeService);
  tracker = this.life.tracker;
  date = signal(this.tracker.today());
  period = signal<'week' | 'month'>('week');
  pretty = prettyDate;
  Math = Math;
  cash = (amount: number) => naira(amount, this.tracker.data().preferences.currency);
  range = computed(() => reportRange(this.period(), this.date()));
  end = computed(() =>
    this.range().end < this.tracker.today() ? this.range().end : this.tracker.today(),
  );
  summary = computed(() => lifeReport(this.tracker.data(), this.range().start, this.end()));
  previous = computed(() => {
    const range = previousRange(this.period(), this.date());
    return lifeReport(this.tracker.data(), range.start, range.end);
  });
  categories = computed(() =>
    groupMoney(
      this.life
        .data()
        .transactions.filter((t) => t.date >= this.range().start && t.date <= this.end()),
      'expense',
    ),
  );
  setDate(value: string) {
    if (validDate(value)) this.date.set(value);
  }
}
