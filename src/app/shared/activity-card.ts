import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Activity } from '../models/tracker';
import { TrackerService } from '../services/tracker';
import { isPaused, isRest, isFrozen, scheduleLabel } from '../core/streaks';
import { Icon } from './icon';
import { StreakCounter } from './ui';
import { RecordForm } from './record-form';
@Component({
  selector: 'app-activity-card',
  imports: [RouterLink, Icon, StreakCounter, RecordForm],
  template: `<article
      class="activity-row"
      [class.is-complete]="isDone()"
      [style.--activity-color]="activity().color"
    >
      <span class="activity-emoji">{{ activity().icon }}</span
      ><a class="activity-info" [routerLink]="['/activities', activity().id]"
        ><h3>
          @if (activity().pinned) {
            <span aria-label="Pinned">☆ </span>
          }
          {{ activity().name }}
        </h3>
        <span
          >{{ activity().category }}<i>·</i
          >{{ blocked() ? 'Resting / paused' : schedule(activity()) }}
          @if (activity().quantityTarget > 1) {
            <i>·</i>{{ tracker.entry(activity())?.quantity || 0 }} / {{ activity().quantityTarget }}
            {{ activity().unit }}
          }
        </span>
        @if (activity().quantityTarget > 1) {
          <span
            class="card-progress"
            role="progressbar"
            aria-label="Daily target progress"
            [attr.aria-valuenow]="
              Math.min(
                100,
                ((tracker.entry(activity())?.quantity ?? 0) / activity().quantityTarget) * 100
              )
            "
            aria-valuemin="0"
            aria-valuemax="100"
            ><i
              [style.width.%]="
                Math.min(
                  100,
                  ((tracker.entry(activity())?.quantity ?? 0) / activity().quantityTarget) * 100
                )
              "
            ></i></span
          ><small class="progress-remaining"
            >{{
              Math.max(0, activity().quantityTarget - (tracker.entry(activity())?.quantity ?? 0))
            }}
            {{ activity().unit }} remaining</small
          >
        }</a
      ><app-streak [count]="tracker.stats(activity()).current" /><button
        class="icon-button row-note"
        aria-label="Edit progress and note"
        (click)="record.set(true)"
      >
        <app-icon name="more" /></button
      ><button
        class="completion-button"
        [class.checked]="isDone()"
        [attr.aria-label]="(isDone() ? 'Undo ' : 'Complete ') + activity().name"
        [attr.aria-pressed]="isDone()"
        [disabled]="activity().startDate > tracker.today() || blocked()"
        (click)="complete()"
      >
        <app-icon name="check" [size]="18" />
      </button>
    </article>
    @if (organize()) {
      <div class="activity-organization">
        <button class="text-button" (click)="tracker.pin(activity())">
          {{ activity().pinned ? 'Unpin favorite' : 'Pin favorite' }}
        </button>
        @if (reorder()) {
          <button
            class="text-button"
            [attr.aria-label]="'Move ' + activity().name + ' up'"
            (click)="tracker.move(activity(), -1)"
          >
            ↑ Move up</button
          ><button
            class="text-button"
            [attr.aria-label]="'Move ' + activity().name + ' down'"
            (click)="tracker.move(activity(), 1)"
          >
            ↓ Move down
          </button>
        }
      </div>
    }
    @if (record()) {
      <app-record-form
        [activity]="activity()"
        [date]="tracker.today()"
        (close)="record.set(false)"
      />
    }`,
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
  schedule = scheduleLabel;
  isDone() {
    return (
      this.tracker.completed(this.activity()) ||
      (this.activity().frequency === 'once' && this.tracker.stats(this.activity()).totalPeriods > 0)
    );
  }
  complete() {
    if (
      this.activity().frequency === 'once' &&
      this.isDone() &&
      !this.tracker.completed(this.activity())
    ) {
      this.tracker.toggle(this.activity(), this.tracker.stats(this.activity()).last!);
      return;
    }
    if (this.activity().quantityTarget > 1 && !this.tracker.completed(this.activity()))
      this.record.set(true);
    else this.tracker.toggle(this.activity());
  }
}
