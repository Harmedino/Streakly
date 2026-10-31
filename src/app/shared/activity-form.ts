import { Component, inject, input, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity, COLORS, EMOJIS } from '../models/tracker';
import { dateKey, validDate } from '../core/dates';
import { TrackerService } from '../services/tracker';
import { Dialog } from './dialog';
@Component({
  selector: 'app-activity-form',
  imports: [FormsModule, Dialog],
  templateUrl: './activity-form.html',
})
export class ActivityForm implements OnInit {
  tracker = inject(TrackerService);
  activity = input<Activity | null>(null);
  close = output<void>();
  saved = output<void>();
  colors = COLORS;
  emojis = EMOJIS;
  today = dateKey();
  error = '';
  customCategory = '';
  days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  model: Activity = {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    icon: '🌱',
    color: COLORS[0],
    category: 'Personal',
    startDate: dateKey(),
    frequency: 'daily',
    weekdays: [1, 2, 3, 4, 5],
    periodTarget: 3,
    interval: 2,
    quantityTarget: 1,
    unit: '',
    reminder: '',
    archived: false,
    updatedAt: '',
  };
  ngOnInit() {
    if (this.activity()) this.model = structuredClone(this.activity()!);
  }
  toggleDay(n: number) {
    this.model.weekdays = this.model.weekdays.includes(n)
      ? this.model.weekdays.filter((d) => d !== n)
      : [...this.model.weekdays, n];
  }
  save() {
    const a = {
      ...this.model,
      name: this.model.name.trim(),
      category:
        this.model.category === '__custom' ? this.customCategory.trim() : this.model.category,
      updatedAt: new Date().toISOString(),
    };
    if (!validDate(a.startDate)) {
      this.error = 'Choose a valid start date.';
      return;
    }
    if (!a.category) {
      this.error = 'Give your category a name.';
      return;
    }
    if (!a.name) {
      this.error = 'Give your activity a name.';
      return;
    }
    if (a.frequency === 'weekdays' && !a.weekdays.length) {
      this.error = 'Choose at least one weekday.';
      return;
    }
    if (
      a.quantityTarget < 1 ||
      a.interval < 1 ||
      a.periodTarget < 1 ||
      a.periodTarget > (a.frequency === 'weekly' ? 7 : 31)
    ) {
      this.error = 'Check your quantity, interval and period targets.';
      return;
    }
    if (
      this.activity() &&
      this.tracker.data().completions.some((e) => e.activityId === a.id && e.date < a.startDate)
    ) {
      this.error = 'Start date cannot move past existing history.';
      return;
    }
    this.tracker.saveActivity(a);
    if (!this.tracker.storage.error()) {
      this.saved.emit();
      this.close.emit();
    }
  }
}
