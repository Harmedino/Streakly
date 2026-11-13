import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrackerService } from '../../../../core/services/tracker';
import {
  addDays,
  monthStart,
  parseDate,
  prettyDate,
  weekStart,
} from '../../../../core/utils/dates';
import { dailyCounts, rangeScore, weeklyReflection } from '../../../../core/utils/insights';
import { isScheduled } from '../../../../core/utils/streaks';
import { Heatmap } from '../../../../shared/components/heatmap/heatmap.component';
import { Icon } from '../../../../shared/components/icon/icon.component';
import { EmptyState, Progress } from '../../../../shared/components/ui/index';
@Component({
  selector: 'app-statistics',
  imports: [RouterLink, Icon, Heatmap, EmptyState, Progress],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss',
})
export class Statistics {
  tracker = inject(TrackerService);
  reflection = computed(() => weeklyReflection(this.tracker.data(), this.tracker.today()));
  currentBest = computed(() =>
    Math.max(0, ...this.tracker.active().map((a) => this.tracker.stats(a).current)),
  );
  pretty = prettyDate;
  weekly = computed(() =>
    rangeScore(this.tracker.data(), weekStart(this.tracker.today()), this.tracker.today()),
  );
  monthly = computed(() =>
    rangeScore(this.tracker.data(), monthStart(this.tracker.today()), this.tracker.today()),
  );
  score = computed(() =>
    rangeScore(this.tracker.data(), addDays(this.tracker.today(), -89), this.tracker.today()),
  );
  total = computed(
    () =>
      this.tracker
        .data()
        .completions.filter(
          (e) =>
            e.date <= this.tracker.today() &&
            e.quantity >=
              (this.tracker.data().activities.find((a) => a.id === e.activityId)?.quantityTarget ??
                1),
        ).length,
  );
  best = computed(() =>
    Math.max(0, ...this.tracker.data().activities.map((a) => this.tracker.stats(a).best)),
  );
  trend = computed(() =>
    dailyCounts(this.tracker.data(), addDays(this.tracker.today(), -27), this.tracker.today()),
  );
  max = computed(() => Math.max(3, ...this.trend().map((d) => d.count)));
  activeDays = computed(() => this.trend().filter((d) => d.count > 0).length);
  consistent = computed(
    () =>
      this.tracker
        .active()
        .filter((a) => this.tracker.stats(a).total > 0)
        .sort((a, b) => this.tracker.stats(b).rate - this.tracker.stats(a).rate)[0],
  );
  weekdays = computed(() =>
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => {
      let total = 0,
        done = 0;
      for (const d of dailyCounts(
        this.tracker.data(),
        addDays(this.tracker.today(), -83),
        this.tracker.today(),
      )) {
        if ((parseDate(d.date).getDay() + 6) % 7 !== i) continue;
        for (const a of this.tracker.active()) {
          if (a.startDate > d.date) continue;
          const scheduled = isScheduled(a, d.date);
          if (scheduled) {
            total++;
            if (this.tracker.completed(a, d.date)) done++;
          }
        }
      }
      return { label, rate: total ? Math.round((done / total) * 100) : 0 };
    }),
  );
  explainDate(date: string) {
    this.tracker.notify(
      prettyDate(date) +
        ': ' +
        this.tracker
          .data()
          .completions.filter(
            (e) =>
              e.date === date &&
              e.quantity >=
                (this.tracker.data().activities.find((a) => a.id === e.activityId)
                  ?.quantityTarget ?? 1),
          ).length +
        ' completed activities. Edit history in Calendar.',
    );
  }
}
