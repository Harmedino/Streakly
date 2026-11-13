import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../../../core/services/tracker';
import { Dialog } from '../dialog/index';
import { Icon } from '../icon/icon.component';
@Component({
  selector: 'app-onboarding',
  imports: [FormsModule, Dialog, Icon],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
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
