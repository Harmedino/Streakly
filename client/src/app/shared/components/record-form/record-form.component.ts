import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity } from '../../../core/models/tracker';
import { TrackerService } from '../../../core/services/tracker';
import { addDays, prettyDate, validDate } from '../../../core/utils/dates';
import { isFrozen, isPaused, isRest } from '../../../core/utils/streaks';
import { BreakControls } from '../break-controls/break-controls.component';
import { Dialog } from '../dialog/index';
@Component({
  selector: 'app-record-form',
  imports: [Dialog, FormsModule, BreakControls],
  templateUrl: './record-form.component.html',
  styleUrl: './record-form.component.scss',
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
