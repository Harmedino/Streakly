import { Component, inject, input, output } from '@angular/core';
import { Activity } from '../models/tracker';
import { TrackerService } from '../services/tracker';
import { calendarStatus, canFreeze, isFrozen, isRest, STATUS_LABELS } from '../core/streaks';
@Component({
  selector: 'app-break-controls',
  template: `<section class="break-controls">
    <p class="helper">
      <strong>{{ status() }}</strong> · {{ explanation() }}
    </p>
    <div class="break-buttons">
      <button
        class="btn"
        type="button"
        [disabled]="!!tracker.entry(activity(), date()) || frozen()"
        (click)="change('rest')"
      >
        {{ rest() ? 'Remove planned rest' : 'Plan rest day' }}
      </button>
      @if (frozen()) {
        <button class="btn" type="button" (click)="change('unfreeze')">Remove freeze</button>
      } @else if (eligible()) {
        <button class="btn" type="button" (click)="change('freeze')">Use streak freeze</button>
      }
    </div>
    <p class="helper">
      {{ used() }} of 2 freezes used · {{ 2 - used() }} remaining in {{ date().slice(0, 7) }}.
      Freezes are manual and only protect past missed days.
    </p>
  </section>`,
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
