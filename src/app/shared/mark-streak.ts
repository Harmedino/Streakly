import { Component, inject, input, signal } from '@angular/core';
import { Activity } from '../models/tracker';
import { TrackerService } from '../services/tracker';
import { dueOn, isFrozen, isPaused, isRest } from '../core/streaks';
import { prettyDate } from '../core/dates';
import { Icon } from './icon';
import { RecordForm } from './record-form';
@Component({
  selector: 'app-mark-streak',
  imports: [Icon, RecordForm],
  template: `<div class="mark-control">
      <div class="mark-buttons">
        <button
          type="button"
          class="btn primary mark-streak-button"
          [class.marked]="done()"
          [disabled]="disabled()"
          [attr.aria-label]="
            done() ? 'Already marked: ' + activity().name : 'Complete ' + activity().name
          "
          [attr.aria-describedby]="'mark-reason-' + activity().id"
          (click)="mark()"
        >
          <app-icon name="check" [size]="17" />{{ done() ? 'Marked' : 'Mark streak' }}
        </button>
        @if (done()) {
          <button
            type="button"
            class="text-button"
            [attr.aria-label]="'Undo ' + activity().name"
            (click)="undo()"
          >
            Undo
          </button>
        }
      </div>
      <span class="mark-reason" [id]="'mark-reason-' + activity().id">{{ reason() }}</span>
    </div>
    @if (record()) {
      <app-record-form
        [activity]="activity()"
        [date]="tracker.today()"
        (close)="record.set(false)"
      />
    }`,
  styleUrl: './mark-streak.scss',
})
export class MarkStreak {
  activity = input.required<Activity>();
  tracker = inject(TrackerService);
  record = signal(false);
  done() {
    return (
      this.tracker.completed(this.activity()) ||
      (this.activity().frequency === 'once' && this.tracker.stats(this.activity()).totalPeriods > 0)
    );
  }
  disabled() {
    return (
      this.done() || !dueOn(this.activity(), this.tracker.data().completions, this.tracker.today())
    );
  }
  reason() {
    const a = this.activity(),
      today = this.tracker.today();
    if (this.done())
      return a.frequency === 'once'
        ? 'One-time goal completed.'
        : 'Marked today. A new day starts at local midnight.';
    if (a.archived) return 'Archived. Restore this activity to mark it.';
    if (a.startDate > today) return 'Starts ' + prettyDate(a.startDate) + '.';
    if (isPaused(a, today)) return 'Paused. Resume the activity to mark it.';
    if (isRest(a, today)) return 'Planned rest today. Your streak is preserved.';
    if (isFrozen(a, today)) return 'This day is protected by a streak freeze.';
    if (!dueOn(a, this.tracker.data().completions, today))
      return a.frequency === 'weekly' || a.frequency === 'monthly'
        ? 'This period’s target is already reached.'
        : 'Not scheduled today. Past days can still be recorded.';
    return 'Ready for your manual check-in today.';
  }
  mark() {
    this.tracker.refreshToday();
    if (this.disabled()) return;
    if (this.activity().quantityTarget > 1) this.record.set(true);
    else this.tracker.toggle(this.activity());
  }
  undo() {
    this.tracker.refreshToday();
    const date =
      this.activity().frequency === 'once'
        ? this.tracker.stats(this.activity()).last
        : this.tracker.today();
    if (date) this.tracker.toggle(this.activity(), date);
  }
}
