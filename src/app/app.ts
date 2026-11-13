import { PwaService } from './services/pwa';
import { ReminderService } from './services/reminders';
import {
  Component,
  effect,
  computed,
  inject,
  signal,
  ElementRef,
  HostListener,
  viewChild,
} from '@angular/core';
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
  navigation = [
    { path: '/', label: 'Overview', icon: 'dashboard' },
    { path: '/activities', label: 'My Streaks', icon: 'flame' },
    { path: '/planner', label: 'Daily Planner', icon: 'check' },
    { path: '/learning', label: 'Learning Journal', icon: 'sprout' },
    { path: '/jobs', label: 'Job Applications', icon: 'target' },
    { path: '/finance', label: 'Finance', icon: 'chart' },
    { path: '/goals', label: 'Goals', icon: 'target' },
    { path: '/journal', label: 'Personal Journal', icon: 'leaf' },
    { path: '/reports', label: 'Reports', icon: 'chart' },
  ];
  tracker = inject(TrackerService);
  todoCount = computed(() => this.tracker.data().todos?.filter((t) => !t.done).length ?? 0);
  pwa = inject(PwaService);
  reminders = inject(ReminderService);
  create = signal(false);
  mobile = signal(false);
  sidebar = viewChild.required<ElementRef<HTMLElement>>('sidebar');
  menuTrigger = viewChild.required<ElementRef<HTMLButtonElement>>('menuTrigger');
  closeMenu() {
    this.mobile.set(false);
    setTimeout(() => this.menuTrigger().nativeElement.focus());
  }
  @HostListener('window:resize') onResize() {
    if (window.innerWidth > 800) this.mobile.set(false);
  }
  openMenu() {
    this.mobile.set(true);
    setTimeout(() => this.sidebar().nativeElement.querySelector<HTMLElement>('a')?.focus());
  }
  @HostListener('document:keydown', ['$event']) menuKey(event: KeyboardEvent) {
    if (!this.mobile()) return;
    if (event.key === 'Escape') {
      this.closeMenu();
    }
    if (event.key === 'Tab') {
      const items = Array.from(
        this.sidebar().nativeElement.querySelectorAll<HTMLElement>('a,button'),
      ).filter((e) => e.offsetParent !== null);
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }
  ngOnDestroy() {
    document.body.classList.remove('mobile-nav-open');
  }
  constructor() {
    effect(() => document.body.classList.toggle('mobile-nav-open', this.mobile()));
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
