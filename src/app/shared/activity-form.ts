import { Component, inject, input, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity, COLORS, EMOJIS } from '../models/tracker';
import { dateKey, validDate } from '../core/dates';
import { TrackerService } from '../services/tracker';
import { ACTIVITY_TEMPLATES } from '../core/templates';
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
  initialRevision = 0;
  templates = ACTIVITY_TEMPLATES;
  templateKey = '';
  customCategory = '';
  days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  model: Activity = {
    id: crypto.randomUUID(),
    progressType: 'binary',
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
    this.initialRevision = this.tracker.data().revision ?? 0;
    if (this.activity()) {
      this.model = structuredClone(this.activity()!);
      this.model.progressType ??= this.model.quantityTarget > 1 ? 'quantity' : 'binary';
    }
  }
  progressChanged() {
    if (this.model.progressType === 'duration') this.model.unit = 'minutes';
    if (this.model.progressType === 'binary') {
      this.model.quantityTarget = 1;
      this.model.unit = '';
    }
  }
  applyTemplate(key: string) {
    const template = this.templates.find((t) => t.key === key);
    if (template) {
      Object.assign(this.model, template.values);
      this.customCategory = '';
    }
  }
  toggleDay(n: number) {
    this.model.weekdays = this.model.weekdays.includes(n)
      ? this.model.weekdays.filter((d) => d !== n)
      : [...this.model.weekdays, n];
  }
  save() {
    if ((this.tracker.data().revision ?? 0) !== this.initialRevision) {
      this.error =
        'Your data changed while this form was open. Close and reopen it to use the latest version.';
      return;
    }
    if (this.model.progressType === 'binary') {
      this.model.quantityTarget = 1;
      this.model.unit = '';
    }
    if (this.model.progressType === 'duration') this.model.unit = 'minutes';
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
      a.quantityTarget < (a.progressType === 'amount' ? 0.01 : 1) ||
      a.interval < 1 ||
      a.periodTarget < 1 ||
      a.periodTarget > (a.frequency === 'weekly' ? 7 : 31)
    ) {
      this.error = 'Check your quantity, interval and period targets.';
      return;
    }
    if (
      this.activity() &&
      [
        ...(this.activity()!.restDays ?? []),
        ...(this.activity()!.freezes ?? []),
        ...(this.activity()!.pauses ?? []).map((p) => p.start),
      ].some((date) => date < a.startDate)
    ) {
      this.error = 'Start date cannot move past recorded breaks.';
      return;
    }
    if (
      this.activity() &&
      this.tracker.data().completions.some((e) => e.activityId === a.id && e.date < a.startDate)
    ) {
      this.error = 'Start date cannot move past existing history.';
      return;
    }
    if (this.tracker.saveActivity(a)) {
      this.saved.emit();
      this.close.emit();
    }
  }
}
