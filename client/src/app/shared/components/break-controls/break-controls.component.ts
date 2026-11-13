import { Component, inject, input, output } from '@angular/core';
import { Activity } from '../../../core/models/tracker';
import { TrackerService } from '../../../core/services/tracker';
import {
  STATUS_LABELS,
  calendarStatus,
  canFreeze,
  isFrozen,
  isRest,
} from '../../../core/utils/streaks';
@Component({
  selector: 'app-break-controls',
  templateUrl: './break-controls.component.html',
  styleUrl: './break-controls.component.scss',
})
export class BreakControls {
  tracker = inject(TrackerService);
  activity = input.required<Activity>();
  date = input.required<string>();
  changed = output<void>();
  a() {
    return (
      this.tracker.data().activities.find((x) => x.id === this.activity().id) ?? this.activity()
    );
  }
  change(action: 'rest' | 'freeze' | 'unfreeze') {
    this.tracker[action](this.a(), this.date());
    this.changed.emit();
  }
  status() {
    return STATUS_LABELS[
      calendarStatus(this.a(), this.tracker.data().completions, this.date(), this.tracker.today())
    ];
  }
  frozen() {
    return isFrozen(this.a(), this.date());
  }
  rest() {
    return isRest(this.a(), this.date());
  }
  eligible() {
    return canFreeze(this.a(), this.tracker.data().completions, this.date(), this.tracker.today());
  }
  used() {
    return (this.a().freezes ?? []).filter((d) => d.slice(0, 7) === this.date().slice(0, 7)).length;
  }
  explanation() {
    const status = calendarStatus(
      this.a(),
      this.tracker.data().completions,
      this.date(),
      this.tracker.today(),
    );
    return status === 'frozen'
      ? 'Your streak is protected, without adding a successful period.'
      : status === 'rest' || status === 'paused'
        ? 'Excluded from tracking. Your streak neither grows nor breaks.'
        : status === 'missed'
          ? 'This scheduled period ended without reaching its target.'
          : status === 'partial'
            ? 'Progress is saved. Reach the target to complete this day.'
            : 'Only successful tracking periods increase your streak.';
  }
}
