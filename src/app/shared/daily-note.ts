import { Component, effect, inject, input, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../services/tracker';
@Component({
  selector: 'app-daily-note',
  imports: [FormsModule],
  template: `<section class="panel spaced-panel daily-note">
    <span class="eyebrow">A MOMENT FOR YOU</span>
    <h2>Your note for {{ date() }}</h2>
    <form (ngSubmit)="save()">
      <label class="sr-only" [for]="'daily-note-' + date()">Daily personal note</label
      ><textarea
        [id]="'daily-note-' + date()"
        name="note"
        [(ngModel)]="note"
        maxlength="1000"
        rows="2"
        placeholder="How did today feel? Anything worth remembering?"
      ></textarea>
      <div class="daily-note-actions">
        <span class="helper">Optional. Private. Saved with your backup.</span
        ><button class="btn" type="submit">Save daily note</button>
      </div>
      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
    </form>
  </section>`,
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
  save() {
    if ((this.tracker.data().dailyNotes?.[this.date()] ?? '') !== this.original) {
      this.error = 'This note changed in another tab. Reopen this date before saving.';
      return;
    }
    if (this.tracker.dailyNote(this.date(), this.note)) {
      this.original = this.note;
      this.tracker.notify('A little moment, safely saved.');
    }
  }
}
