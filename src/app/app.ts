import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TrackerService } from './services/tracker';
import { Icon } from './shared/icon';
import { Onboarding } from './shared/onboarding';
import { ActivityForm } from './shared/activity-form';
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon, Onboarding, ActivityForm],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  tracker = inject(TrackerService);
  create = signal(false);
  mobile = signal(false);
  constructor() {
    effect(() => {
      document.documentElement.dataset['theme'] = this.tracker.data().preferences.theme;
    });
  }
  toggleTheme() {
    this.tracker.update(
      (d) => (d.preferences.theme = d.preferences.theme === 'light' ? 'dark' : 'light'),
    );
  }
  initials() {
    return (this.tracker.data().preferences.name || 'You').slice(0, 2).toUpperCase();
  }
}
