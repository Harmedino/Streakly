import { Component, computed, inject, input, output } from '@angular/core';
import { TrackerService } from '../services/tracker';
import { addDays, datesBetween, prettyDate, weekStart } from '../core/dates';
@Component({
  selector: 'app-heatmap',
  template: `<div class="heatmap-scroll">
      <div class="heatmap" role="group" aria-label="Completion history for the last 26 weeks">
        @for (day of days(); track day.date) {
          <button
            [disabled]="day.date > tracker.today()"
            [class.level1]="day.count === 1"
            [class.level2]="day.count === 2"
            [class.level3]="day.count >= 3"
            [attr.title]="pretty(day.date) + ': ' + day.count + ' completions'"
            [attr.aria-label]="pretty(day.date) + ': ' + day.count + ' completions'"
            (click)="select.emit(day.date)"
          ></button>
        }
      </div>
    </div>
    <div class="heatmap-caption">
      <span>Every small square tells a story.</span
      ><span
        >Less <i></i><i class="level1"></i><i class="level2"></i><i class="level3"></i> More</span
      >
    </div>`,
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
