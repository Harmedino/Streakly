import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Activity } from '../models/tracker';
import { TrackerService } from '../services/tracker';
import { isPaused, isRest, isFrozen, scheduleLabel } from '../core/streaks';
import { Icon } from './icon';
import { StreakCounter } from './ui';
import { addDays } from '../core/dates';
import { MarkStreak } from './mark-streak';
import { RecordForm } from './record-form';
@Component({
  selector: 'app-activity-card',
  imports: [RouterLink, Icon, StreakCounter, RecordForm, MarkStreak],
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
        (click)="openRecord()"
      >
        <app-icon name="more" /></button
      ><app-mark-streak [activity]="activity()" />
    </article>
    <div class="activity-organization">
      <button
        type="button"
        class="text-button"
        [attr.aria-label]="'Mark a past day for ' + activity().name"
        (click)="openHistory()"
      >
        Mark a past day
      </button>
      @if (organize()) {
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
      }
    </div>
    @if (record()) {
      <app-record-form [activity]="activity()" [date]="recordDate()" (close)="record.set(false)" />
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
