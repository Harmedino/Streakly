import { Component, inject, input, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity } from '../models/tracker';
import { prettyDate } from '../core/dates';
import { TrackerService } from '../services/tracker';
import { Dialog } from './dialog';
@Component({
  selector: 'app-record-form',
  imports: [Dialog, FormsModule],
  template: `<app-dialog [title]="activity().icon + ' ' + activity().name" (close)="close.emit()"
    ><p class="muted">
      {{ pretty(date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
    </p>
    <form (ngSubmit)="save()" #form="ngForm">
      <label
        >Progress · target {{ activity().quantityTarget }} {{ activity().unit
        }}<input
          type="number"
          name="quantity"
          [(ngModel)]="quantity"
          min="0"
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
      <p class="helper">Set progress to 0 to remove this completion.</p>
      <div class="form-actions">
        <button type="button" class="btn" (click)="close.emit()">Cancel</button
        ><button class="btn primary" [disabled]="form.invalid">Save progress</button>
      </div>
    </form></app-dialog
  >`,
})
export class RecordForm implements OnInit {
  tracker = inject(TrackerService);
  activity = input.required<Activity>();
  date = input.required<string>();
  close = output<void>();
  quantity = 1;
  note = '';
  pretty = prettyDate;
  ngOnInit() {
    const e = this.tracker.entry(this.activity(), this.date());
    this.quantity = e?.quantity ?? this.activity().quantityTarget;
    this.note = e?.note ?? '';
  }
  save() {
    this.tracker.record(this.activity(), this.date(), this.quantity, this.note);
    if (!this.tracker.storage.error()) this.close.emit();
  }
}
