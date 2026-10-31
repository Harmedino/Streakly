import { Component, inject, input, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity } from '../models/tracker';
import { prettyDate } from '../core/dates';
import { TrackerService } from '../services/tracker';
import { isFrozen, isPaused, isRest } from '../core/streaks';
import { BreakControls } from './break-controls';
import { Dialog } from './dialog';
@Component({
  selector: 'app-record-form',
  imports: [Dialog, FormsModule, BreakControls],
  template: `<app-dialog [title]="activity().icon + ' ' + activity().name" (close)="close.emit()"
    ><p class="muted">
      {{ pretty(date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
    </p>
    <app-break-controls
      [activity]="activity()"
      [date]="date()"
      (changed)="initialRevision = tracker.data().revision ?? 0"
    />
    @if (date() <= tracker.today() && !blocked()) {
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
        @if (error) {
          <p class="error" role="alert">{{ error }}</p>
        }
        <p class="helper">Set progress to 0 to remove this completion.</p>
        <div class="form-actions">
          <button type="button" class="btn" (click)="close.emit()">Cancel</button
          ><button class="btn primary" [disabled]="form.invalid">Save progress</button>
        </div>
      </form>
    }
  </app-dialog>`,
})
export class RecordForm implements OnInit {
  tracker = inject(TrackerService);
  activity = input.required<Activity>();
  date = input.required<string>();
  close = output<void>();
  quantity = 1;
  error = '';
  Math = Math;
  initialRevision = 0;
  blocked() {
    const a =
      this.tracker.data().activities.find((x) => x.id === this.activity().id) ?? this.activity();
    return (
      isFrozen(a, this.date()) ||
      isRest(a, this.date()) ||
      (isPaused(a, this.date()) && !this.tracker.entry(a, this.date()))
    );
  }
  note = '';
  pretty = prettyDate;
  ngOnInit() {
    this.initialRevision = this.tracker.data().revision ?? 0;
    const e = this.tracker.entry(this.activity(), this.date());
    this.quantity = e?.quantity ?? this.activity().quantityTarget;
    this.note = e?.note ?? '';
  }
  save() {
    if ((this.tracker.data().revision ?? 0) !== this.initialRevision) {
      this.error = 'Data changed while this form was open. Close and reopen it before saving.';
      return;
    }
    if (this.tracker.record(this.activity(), this.date(), this.quantity, this.note))
      this.close.emit();
  }
}
