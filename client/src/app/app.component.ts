import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { PwaService } from './core/services/pwa';
import { ReminderService } from './core/services/reminders';
import { TrackerService } from './core/services/tracker';
import { AccountAccess, BrowserMigration } from './shared/components/account-access/index';
import { ActivityForm } from './shared/components/activity-form/activity-form.component';
import { Icon } from './shared/components/icon/icon.component';
import { Onboarding } from './shared/components/onboarding/onboarding.component';
@Component({
  selector: 'app-root',
  imports: [
    AccountAccess,
    BrowserMigration,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    Icon,
    Onboarding,
    ActivityForm,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class App {
  resetRequested = new URLSearchParams(location.search).has('reset');
  navigation = [
    { path: '/', label: 'Overview', icon: 'dashboard' },
    { path: '/activities', label: 'My Streaks', icon: 'flame' },
    { path: '/planner', label: 'Daily Planner', icon: 'check' },
    { path: '/learning', label: 'Learning Journal', icon: 'book' },
    { path: '/jobs', label: 'Job Applications', icon: 'briefcase' },
    { path: '/finance', label: 'Finance', icon: 'wallet' },
    { path: '/goals', label: 'Goals', icon: 'target' },
    { path: '/journal', label: 'Personal Journal', icon: 'notebook' },
    { path: '/reports', label: 'Reports', icon: 'chart' },
  ];
  router = inject(Router);
  currentPath = signal(this.router.url);
  routeLoading = signal(false);
  pageTitle = computed(() => {
    const path = this.currentPath().split('?')[0];
    return (
      this.navigation.find((n) => n.path === path)?.label ??
      (path.startsWith('/goals/')
        ? 'Goal details'
        : path.startsWith('/jobs/')
          ? 'Application details'
          : path.startsWith('/activities/')
            ? 'Activity details'
            : path === '/calendar'
              ? 'Calendar'
              : path === '/statistics'
                ? 'Habit insights'
                : 'Settings')
    );
  });
  private navigationSubscription = this.router.events.subscribe((event) => {
    if (event instanceof NavigationStart) this.routeLoading.set(true);
    if (event instanceof NavigationEnd) this.currentPath.set(event.urlAfterRedirects);
    if (
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError
    )
      this.routeLoading.set(false);
  });
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
    this.navigationSubscription.unsubscribe();
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
