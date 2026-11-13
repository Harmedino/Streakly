import { Component, effect, inject, input, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../../../core/services/tracker';
@Component({
  selector: 'app-daily-note',
  imports: [FormsModule],
  templateUrl: './daily-note.component.html',
  styleUrl: './daily-note.component.scss',
})
export class DailyNote {
  tracker = inject(TrackerService);
  date = input.required<string>();
  note = '';
  original = '';
  error = '';
  constructor() {
    effect(() => {
      const date = this.date();
      this.original = untracked(() => this.tracker.data().dailyNotes?.[date] ?? '');
      this.note = this.original;
      this.error = '';
    });
  }
  async save() {
    if ((this.tracker.data().dailyNotes?.[this.date()] ?? '') !== this.original) {
      this.error = 'This note changed in another tab. Reopen this date before saving.';
      return;
    }
    if (this.tracker.dailyNote(this.date(), this.note) && (await this.tracker.settled())) {
      this.original = this.note;
      this.tracker.notify('A little moment, safely saved.');
    }
  }
}
