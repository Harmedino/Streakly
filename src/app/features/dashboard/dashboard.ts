import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TrackerService } from '../../services/tracker';
import { Icon } from '../../shared/icon';
import { ActivityCard } from '../../shared/activity-card';
import { ActivityForm } from '../../shared/activity-form';
import { Calendar } from '../../shared/calendar';
import { EmptyState } from '../../shared/ui';
import { addDays, prettyDate, weekStart } from '../../core/dates';
import { dailyCounts, rangeScore } from '../../core/insights';
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon, ActivityCard, ActivityForm, Calendar, EmptyState],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  tracker = inject(TrackerService);
  router = inject(Router);
  create = signal(false);
  filter = signal('all');
  pretty = prettyDate;
  progress = computed(() =>
    this.tracker.scheduled().length
      ? Math.round((this.tracker.done() / this.tracker.scheduled().length) * 100)
      : 0,
  );
  activeStreaks = computed(
    () => this.tracker.active().filter((a) => this.tracker.stats(a).current > 0).length,
  );
  best = computed(() =>
    Math.max(0, ...this.tracker.data().activities.map((a) => this.tracker.stats(a).best)),
  );
  weekly = computed(() =>
    rangeScore(this.tracker.data(), weekStart(this.tracker.today()), this.tracker.today()),
  );
  days = computed(() =>
    dailyCounts(
      this.tracker.data(),
      weekStart(this.tracker.today()),
      addDays(weekStart(this.tracker.today()), 6),
    ).map((d) => ({
      ...d,
      label: prettyDate(d.date, { weekday: 'short' }),
      today: d.date === this.tracker.today(),
      future: d.date > this.tracker.today(),
    })),
  );
  max = computed(() => Math.max(3, ...this.days().map((d) => d.count)));
  list = computed(() =>
    this.tracker
      .scheduled()
      .filter(
        (a) => this.filter() === 'all' || (this.filter() === 'done') === this.tracker.completed(a),
      ),
  );
  greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
}
