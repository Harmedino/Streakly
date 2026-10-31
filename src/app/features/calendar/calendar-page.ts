import { DailyNote } from '../../shared/daily-note';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TrackerService } from '../../services/tracker';
import { Calendar } from '../../shared/calendar';
import { Icon } from '../../shared/icon';
import { RecordForm } from '../../shared/record-form';
import { Activity } from '../../models/tracker';
import { prettyDate, validDate } from '../../core/dates';
import { calendarStatus, STATUS_LABELS } from '../../core/streaks';
import { EmptyState } from '../../shared/ui';
@Component({
  selector: 'app-calendar-page',
  imports: [DailyNote, FormsModule, RouterLink, Calendar, Icon, RecordForm, EmptyState],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">THE DAYS ADD UP</span>
        <h1>Your consistency calendar<span class="greeting-dot">.</span></h1>
        <p>A little perspective on all the times you showed up.</p>
      </div>
      <select
        aria-label="Filter calendar by activity"
        [ngModel]="filter()"
        (ngModelChange)="filter.set($event)"
      >
        <option value="">All activities</option>
        @for (a of tracker.data().activities; track a.id) {
          <option [value]="a.id">
            {{ a.icon }} {{ a.name }}{{ a.archived ? ' (archived)' : '' }}
          </option>
        }
      </select>
    </div>
    <div class="calendar-layout">
      <section class="panel full-calendar">
        <app-calendar
          [large]="true"
          [activityId]="filter()"
          [selected]="selected()"
          (select)="selected.set($event)"
        />
        <div class="calendar-legend">
          <span><i class="complete-dot"></i>Completed</span
          ><span><i class="missed-dot"></i>Missed</span><span><i class="today-dot"></i>Today</span
          ><span><i class="upcoming-dot"></i>Upcoming</span><span>◐ Partial</span><span>— Rest</span
          ><span>◇ Freeze</span><span>Ⅱ Paused</span>
        </div>
      </section>
      <aside class="panel day-panel">
        <span class="eyebrow">A MOMENT IN TIME</span>
        <h2>{{ pretty(selected(), { weekday: 'long', day: 'numeric', month: 'long' }) }}</h2>
        <p class="muted small">
          {{
            selected() > tracker.today()
              ? 'A fresh day of possibilities.'
              : 'Your little wins, and room to grow.'
          }}
        </p>
        @for (a of activities(); track a.id) {
          <div class="day-activity">
            <span class="activity-emoji" [style.--activity-color]="a.color">{{ a.icon }}</span>
            <div>
              <a [routerLink]="['/activities', a.id]">{{ a.name }}</a
              ><small [class.status-done]="tracker.completed(a, selected())">{{ status(a) }}</small>
              @if (tracker.entry(a, selected())?.note) {
                <small>{{ tracker.entry(a, selected())?.note }}</small>
              }
            </div>
            <button
              class="icon-button"
              (click)="editing.set(a)"
              [attr.aria-label]="'Edit ' + a.name + ' on selected date'"
            >
              <app-icon [name]="tracker.completed(a, selected()) ? 'check' : 'plus'" [size]="18" />
            </button>
          </div>
        } @empty {
          <app-empty
            title="A quiet day."
            description="No scheduled activities or recorded moments for this date."
          />
        }
        <p class="helper">Historical edits update your streaks and insights immediately.</p>
      </aside>
    </div>
    <app-daily-note [date]="selected()" />
    @if (editing(); as a) {
      <app-record-form [activity]="a" [date]="selected()" (close)="editing.set(null)" />
    }`,
})
export class CalendarPage {
  tracker = inject(TrackerService);
  route = inject(ActivatedRoute);
  initialDate = this.route.snapshot.queryParamMap.get('date');
  filter = signal('');
  selected = signal(validDate(this.initialDate) ? this.initialDate : this.tracker.today());
  editing = signal<Activity | null>(null);
  pretty = prettyDate;
  activities = computed(() =>
    this.tracker
      .data()
      .activities.filter(
        (a) =>
          (!this.filter() || a.id === this.filter()) &&
          (!a.archived || this.filter()) &&
          this.selected() >= a.startDate,
      ),
  );
  status(a: Activity) {
    return STATUS_LABELS[
      calendarStatus(a, this.tracker.data().completions, this.selected(), this.tracker.today())
    ];
  }
}
