import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Activity } from '../../../core/models/tracker';
import { TrackerService } from '../../../core/services/tracker';
import { addDays } from '../../../core/utils/dates';
import { isFrozen, isPaused, isRest, scheduleLabel } from '../../../core/utils/streaks';
import { Icon } from '../icon/icon.component';
import { MarkStreak } from '../mark-streak/mark-streak.component';
import { RecordForm } from '../record-form/record-form.component';
import { StreakCounter } from '../ui/index';
@Component({
  selector: 'app-activity-card',
  imports: [RouterLink, Icon, StreakCounter, RecordForm, MarkStreak],
  templateUrl: './activity-card.component.html',
  styleUrl: './activity-card.component.scss',
})
export class ActivityCard {
  activity = input.required<Activity>();
  organize = input(false);
  reorder = input(false);
  Math = Math;
  blocked() {
    return (
      isPaused(this.activity(), this.tracker.today()) ||
      isRest(this.activity(), this.tracker.today()) ||
      isFrozen(this.activity(), this.tracker.today())
    );
  }
  tracker = inject(TrackerService);
  record = signal(false);
  recordDate = signal(this.tracker.today());
  openRecord(date?: string) {
    this.tracker.refreshToday();
    this.recordDate.set(date ?? this.tracker.today());
    this.record.set(true);
  }
  openHistory() {
    this.tracker.refreshToday();
    const yesterday = addDays(this.tracker.today(), -1);
    this.openRecord(yesterday >= this.activity().startDate ? yesterday : this.tracker.today());
  }
  schedule = scheduleLabel;
  isDone() {
    return (
      this.tracker.completed(this.activity()) ||
      (this.activity().frequency === 'once' && this.tracker.stats(this.activity()).totalPeriods > 0)
    );
  }
}
