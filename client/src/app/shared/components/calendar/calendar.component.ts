import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TrackerService } from '../../../core/services/tracker';
import {
  addDays,
  dateKey,
  datesBetween,
  monthEnd,
  monthShift,
  monthStart,
  parseDate,
  prettyDate,
} from '../../../core/utils/dates';
import {
  STATUS_LABELS,
  calendarStatus,
  completeOn,
  dueOn,
  missedOn,
} from '../../../core/utils/streaks';
import { Icon } from '../icon/icon.component';
@Component({
  selector: 'app-calendar',
  imports: [Icon],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class Calendar {
  tracker = inject(TrackerService);
  activityId = input('');
  recordDates = input<string[] | null>(null);
  recordLabel = input('records');
  large = input(false);
  selected = input('');
  select = output<string>();
  month = signal(monthStart(dateKey()));
  pretty = prettyDate;
  weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  cells = computed(() => {
    const start = monthStart(this.month());
    const offset = (parseDate(start).getDay() + 6) % 7;
    const end = monthEnd(start);
    const count = Math.ceil((offset + parseDate(end).getDate()) / 7) * 7;
    return datesBetween(addDays(start, -offset), addDays(start, count - offset - 1)).map((date) => {
      if (this.recordDates() !== null) {
        const done = this.recordDates()!.filter((d) => d === date).length;
        return {
          state: done ? 'completed' : 'unscheduled',
          status: done + ' ' + this.recordLabel(),
          date,
          number: parseDate(date).getDate(),
          outside: date.slice(0, 7) !== start.slice(0, 7),
          due: 0,
          done,
          missed: false,
        };
      }
      const activities = this.tracker
        .data()
        .activities.filter(
          (a) =>
            (!this.activityId() || a.id === this.activityId()) &&
            (!a.archived || this.activityId()),
        );
      const due = activities.filter((a) =>
        dueOn({ ...a, archived: false }, this.tracker.data().completions, date),
      ).length;
      const done = activities.filter((a) =>
        completeOn(a, this.tracker.data().completions, date),
      ).length;
      const states = activities.map((a) =>
        calendarStatus(a, this.tracker.data().completions, date, this.tracker.today()),
      );
      const state =
        ['completed', 'partial', 'frozen', 'paused', 'rest', 'missed', 'upcoming', 'pending'].find(
          (s) => states.includes(s as any),
        ) ?? 'unscheduled';
      return {
        state,
        status: [...new Set(states.map((s) => STATUS_LABELS[s]))].join(', ') || 'Unscheduled',
        date,
        number: parseDate(date).getDate(),
        outside: date.slice(0, 7) !== start.slice(0, 7),
        due,
        done,
        missed: activities.some((a) =>
          missedOn(a, this.tracker.data().completions, date, this.tracker.today()),
        ),
      };
    });
  });
  move(n: number) {
    this.month.set(monthShift(this.month(), n));
  }
}
