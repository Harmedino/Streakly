import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../services/tracker';
import { Dialog } from './dialog';
import { Icon } from './icon';
@Component({
  selector: 'app-onboarding',
  imports: [FormsModule, Dialog, Icon],
  template: `<app-dialog title="A little space to grow." (close)="finish(false)"
    ><div class="onboarding-art"><app-icon name="sprout" [size]="60" /><span>✦</span></div>
    <p class="onboarding-copy">
      Welcome to Streakly. Build a life you love,<br />one small action at a time.
    </p>
    <form (ngSubmit)="finish(true)" #form="ngForm">
      <label
        >First, what should we call you?<input
          name="name"
          [(ngModel)]="name"
          maxlength="80"
          placeholder="Your first name"
          required /></label
      ><button class="btn primary full-width" [disabled]="form.invalid">
        Let's plant your first habit <app-icon name="arrow" [size]="17" />
      </button>
    </form>
    <button class="text-button onboarding-skip" (click)="finish(false)">I'll explore first</button>
    <p class="helper center">
      Your data stays in this browser. No account, no pressure.<br />Export backups in Settings to
      keep your progress safe.
    </p></app-dialog
  >`,
})
export class Onboarding {
  tracker = inject(TrackerService);
  create = output<void>();
  name = '';
  async finish(first: boolean) {
    if (
      this.tracker.update((d) => {
        d.preferences.name = this.name.trim() || 'friend';
        d.preferences.onboarded = true;
      })
    ) {
      if (await this.tracker.settled()) {
        if (first) this.create.emit();
      }
    }
  }
}
