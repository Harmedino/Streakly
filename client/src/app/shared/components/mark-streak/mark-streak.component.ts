import { Component, inject, input, signal } from '@angular/core';
import { Activity } from '../../../core/models/tracker';
import { TrackerService } from '../../../core/services/tracker';
import { prettyDate } from '../../../core/utils/dates';
import { dueOn, isFrozen, isPaused, isRest } from '../../../core/utils/streaks';
import { Icon } from '../icon/icon.component';
import { RecordForm } from '../record-form/record-form.component';
@Component({
  selector: 'app-mark-streak',
  imports: [Icon, RecordForm],
  templateUrl: './mark-streak.component.html',
  styleUrl: './mark-streak.component.scss',
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
      !!this.activity().automation ||
      this.done() ||
      !dueOn(this.activity(), this.tracker.data().completions, this.tracker.today())
    );
  }
  reason() {
    const a = this.activity(),
      today = this.tracker.today();
    if (a.automation) {
      const credit = this.tracker
        .data()
        .autoCredits?.find((c) => c.activityId === a.id && c.date === today);
      return credit
        ? 'Completed automatically from ' +
            credit.sources.length +
            ' ' +
            credit.trigger +
            ' record(s).'
        : 'Automatic · waiting for qualifying ' + a.automation.trigger + ' records.';
    }
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
