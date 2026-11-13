import { Injectable, inject, signal } from '@angular/core';
import { dateKey } from '../utils/dates';
import { dueOn } from '../utils/streaks';
import { TrackerService } from './tracker';
@Injectable({ providedIn: 'root' })
export class ReminderService {
  tracker = inject(TrackerService);
  readonly permission = signal<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  private timer = window.setInterval(() => this.check(), 30000);
  async enable() {
    if (typeof Notification !== 'undefined') {
      try {
        this.permission.set(await Notification.requestPermission());
      } catch {
        this.permission.set('denied');
      }
    }
    this.tracker.update((d) => (d.preferences.remindersEnabled = true));
    this.check();
  }
  disable() {
    this.tracker.update((d) => (d.preferences.remindersEnabled = false));
  }
  async check(now = new Date()) {
    if (!this.tracker.data().preferences.remindersEnabled) return;
    const today = dateKey(now),
      time =
        String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    for (const a of this.tracker.active()) {
      const key = a.id + ':' + today;
      if (
        !a.reminder ||
        a.reminder > time ||
        !dueOn(a, this.tracker.data().completions, today) ||
        this.tracker.completed(a, today) ||
        this.tracker.data().reminderLog?.includes(key)
      )
        continue;
      // Storage's compare-before-write prevents two stale tabs from both claiming a reminder.
      if (
        !this.tracker.update((d) => {
          d.reminderLog = [...(d.reminderLog ?? []).filter((x) => x.endsWith(today)), key];
        })
      )
        continue;
      this.tracker.notify('A little reminder: ' + a.name);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker?.getRegistration();
          if (registration)
            await registration.showNotification('A little moment for you', {
              body: a.name,
              tag: key,
              icon: '/icons/icon-192.png',
            });
          else
            new Notification('A little moment for you', {
              body: a.name,
              tag: key,
              icon: '/icons/icon-192.png',
            });
        } catch {
          /* The in-app reminder above remains available. */
        }
      }
    }
  }
  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
