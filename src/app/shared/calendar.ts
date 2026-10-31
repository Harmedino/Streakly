import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  dateKey,
  datesBetween,
  addDays,
  monthStart,
  monthEnd,
  monthShift,
  parseDate,
  prettyDate,
} from '../core/dates';
import { TrackerService } from '../services/tracker';
import { calendarStatus, completeOn, dueOn, missedOn, STATUS_LABELS } from '../core/streaks';
import { Icon } from './icon';
@Component({
  selector: 'app-calendar',
  imports: [Icon],
  template: `<div class="calendar-top">
      <h3>{{ pretty(month(), { month: 'long', year: 'numeric' }) }}</h3>
      <div class="calendar-arrows">
        <button class="icon-button" aria-label="Previous month" (click)="move(-1)">
          <app-icon name="left" [size]="17" /></button
        ><button class="icon-button" aria-label="Next month" (click)="move(1)">
          <app-icon name="right" [size]="17" />
        </button>
      </div>
    </div>
    <div class="calendar-grid" [class.large]="large()">
      @for (day of weekdays; track $index) {
        <span class="weekday">{{ day }}</span>
      }
      @for (d of cells(); track d.date) {
        <button
          class="calendar-day"
          [class.other-month]="d.outside"
          [class.today]="d.date === tracker.today()"
          [class.success]="d.done > 0"
          [class.partial]="d.state === 'partial' || (d.done > 0 && d.done < d.due)"
          [class.rest-day]="d.state === 'rest'"
          [class.frozen-day]="d.state === 'frozen'"
          [class.paused-day]="d.state === 'paused'"
          [class.missed]="d.missed"
          [class.upcoming]="d.date > tracker.today() && d.due > 0"
          [class.selected-day]="d.date === selected()"
          [disabled]="d.outside"
          (click)="select.emit(d.date)"
          [attr.aria-label]="
            pretty(d.date, { day: 'numeric', month: 'long', year: 'numeric' }) +
            ': ' +
            d.done +
            ' completed, ' +
            d.due +
            ' scheduled · ' +
            d.status
          "
          [attr.title]="d.status"
        >
          <span>{{ d.number }}</span>
          @if (large() && d.due) {
            <small>{{ d.done }} / {{ d.due }}</small>
          }
          @if (['rest', 'frozen', 'paused'].includes(d.state)) {
            <small class="day-symbol">{{
              d.state === 'frozen' ? '◇' : d.state === 'paused' ? 'Ⅱ' : '—'
            }}</small>
          }
          @if (d.done) {
            <i></i>
          }
        </button>
      }
    </div>`,
})
export class Calendar {
  tracker = inject(TrackerService);
  activityId = input('');
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
