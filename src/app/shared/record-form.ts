import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity } from '../models/tracker';
import { addDays, prettyDate, validDate } from '../core/dates';
import { TrackerService } from '../services/tracker';
import { isFrozen, isPaused, isRest } from '../core/streaks';
import { BreakControls } from './break-controls';
import { Dialog } from './dialog';
@Component({
  selector: 'app-record-form',
  imports: [Dialog, FormsModule, BreakControls],
  template: `<app-dialog [title]="activity().icon + ' ' + activity().name" (close)="close.emit()"
    ><p class="muted">
      {{
        pretty(selectedDate(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      }}
    </p>
    <label
      >Completion date<input
        type="date"
        name="completionDate"
        [ngModel]="selectedDate()"
        (ngModelChange)="changeDate($event)"
        [min]="activity().startDate"
        [max]="tracker.today()"
        required
    /></label>
    <div class="record-date-shortcuts">
      <button type="button" class="btn" (click)="changeDate(tracker.today())">Today</button
      ><button
        type="button"
        class="btn"
        [disabled]="yesterday() < activity().startDate"
        (click)="changeDate(yesterday())"
      >
        Yesterday
      </button>
    </div>
    <p class="helper">
      You choose when to mark this activity. Past entries count for the day you select. A new
      check-in day starts at local midnight, not 24 hours after your last entry.
    </p>
    @if (dateError) {
      <p class="error" role="alert">{{ error }}</p>
    }
    <app-break-controls
      [hidden]="dateError"
      [activity]="activity()"
      [date]="selectedDate()"
      (changed)="initialRevision = tracker.data().revision ?? 0"
    />
    @if (selectedDate() <= tracker.today() && !blocked()) {
      <form (ngSubmit)="save()" #form="ngForm">
        <label
          >Progress · target {{ activity().quantityTarget }} {{ activity().unit
          }}<input
            type="number"
            name="quantity"
            [(ngModel)]="quantity"
            min="0"
            step="any"
            max="1000000"
            required /></label
        ><label
          >A note for yourself<textarea
            name="note"
            [(ngModel)]="note"
            maxlength="1000"
            rows="3"
            placeholder="What did you do? How did it feel?"
          ></textarea>
        </label>
        <p class="helper">
          {{ Math.max(0, activity().quantityTarget - quantity) }} {{ activity().unit }} remaining.
          Target reached automatically when progress meets your goal.
        </p>
        @if (error && !dateError) {
          <p class="error" role="alert">{{ error }}</p>
        }
        <p class="helper">Set progress to 0 to remove this completion.</p>
        <div class="form-actions">
          <button type="button" class="btn" (click)="close.emit()">Cancel</button
          ><button class="btn primary" [disabled]="form.invalid || dateError">Save progress</button>
        </div>
      </form>
    }
  </app-dialog>`,
})
export class RecordForm implements OnInit {
  tracker = inject(TrackerService);
  activity = input.required<Activity>();
  date = input.required<string>();
  selectedDate = signal('');
  dateError = false;
  yesterday() {
    return addDays(this.tracker.today(), -1);
  }
  changeDate(value: string) {
    if (!validDate(value) || value < this.activity().startDate || value > this.tracker.today()) {
      this.dateError = true;
      this.error = 'Choose a date from the activity start through today.';
      return;
    }
    this.dateError = false;
    this.selectedDate.set(value);
    this.loadEntry();
  }
  private loadEntry() {
    this.error = '';
    this.initialRevision = this.tracker.data().revision ?? 0;
    const e = this.tracker.entry(this.activity(), this.selectedDate());
    this.quantity = e?.quantity ?? this.activity().quantityTarget;
    this.note = e?.note ?? '';
  }
  close = output<void>();
  quantity = 1;
  error = '';
  Math = Math;
  initialRevision = 0;
  blocked() {
    const a =
      this.tracker.data().activities.find((x) => x.id === this.activity().id) ?? this.activity();
    return (
      isFrozen(a, this.selectedDate()) ||
      isRest(a, this.selectedDate()) ||
      (isPaused(a, this.selectedDate()) && !this.tracker.entry(a, this.selectedDate()))
    );
  }
  note = '';
  pretty = prettyDate;
  ngOnInit() {
    this.tracker.refreshToday();
    this.selectedDate.set(this.date());
    this.loadEntry();
  }
  async save() {
    if (this.dateError) return;
    if ((this.tracker.data().revision ?? 0) !== this.initialRevision) {
      this.error = 'Data changed while this form was open. Close and reopen it before saving.';
      return;
    }
    if (
      this.tracker.record(this.activity(), this.selectedDate(), this.quantity, this.note) &&
      (await this.tracker.settled())
    )
      this.close.emit();
  }
}
