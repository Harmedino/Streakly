import { Component, computed, inject, input, output } from '@angular/core';
import { TrackerService } from '../../../core/services/tracker';
import { addDays, datesBetween, prettyDate, weekStart } from '../../../core/utils/dates';
@Component({
  selector: 'app-heatmap',
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss',
})
export class Heatmap {
  tracker = inject(TrackerService);
  activityId = input('');
  select = output<string>();
  pretty = prettyDate;
  days = computed(() =>
    datesBetween(
      addDays(weekStart(this.tracker.today()), -175),
      addDays(weekStart(this.tracker.today()), 6),
    ).map((date) => ({
      date,
      count: this.tracker
        .data()
        .completions.filter(
          (e) =>
            e.date === date &&
            (!this.activityId() || e.activityId === this.activityId()) &&
            e.quantity >=
              (this.tracker.data().activities.find((a) => a.id === e.activityId)?.quantityTarget ??
                1),
        ).length,
    })),
  );
}
