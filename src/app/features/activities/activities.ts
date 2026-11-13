import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TrackerService } from '../../services/tracker';
import { Icon } from '../../shared/icon';
import { ActivityCard } from '../../shared/activity-card';
import { ActivityForm } from '../../shared/activity-form';
import { EmptyState } from '../../shared/ui';
@Component({
  selector: 'app-activities',
  imports: [FormsModule, RouterLink, Icon, ActivityCard, ActivityForm, EmptyState],
  styleUrl: './activities.scss',
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">MAKE SPACE FOR WHAT MATTERS</div>
        <h1>Your activities<span class="greeting-dot">.</span></h1>
        <p>Little commitments. Lasting change. All in one place.</p>
      </div>
      <button class="btn primary" (click)="create.set(true)">
        <app-icon name="plus" [size]="18" />New activity
      </button>
    </div>
    <div class="streak-overview">
      <div>
        <span class="streak-overview-icon"><app-icon name="flame" [size]="20" /></span
        ><strong>{{ tracker.active().length }}</strong
        ><span>active habits</span>
      </div>
      <div>
        <strong>{{ tracker.done() }} / {{ tracker.scheduled().length }}</strong
        ><span>completed today</span>
      </div>
      <div>
        <a class="text-button" routerLink="/calendar"
          ><app-icon name="calendar" [size]="16" />Calendar history</a
        ><a class="text-button" routerLink="/statistics"
          ><app-icon name="chart" [size]="16" />Habit insights</a
        >
      </div>
    </div>
    <div class="toolbar">
      <div class="search-input">
        <app-icon name="search" [size]="18" /><input
          aria-label="Search activities"
          placeholder="Find an activity…"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
      </div>
      <select
        aria-label="Filter category"
        [ngModel]="category()"
        (ngModelChange)="category.set($event)"
      >
        <option value="">All categories</option>
        @for (c of tracker.data().categories; track c) {
          <option>{{ c }}</option>
        }</select
      ><select aria-label="Sort activities" [ngModel]="sort()" (ngModelChange)="sort.set($event)">
        <option value="custom">My order · pinned first</option>
        <option value="updated">Recently updated</option>
        <option value="name">Name A–Z</option>
        <option value="streak">Current streak</option>
        <option value="rate">Completion rate</option>
      </select>
    </div>
    <div class="tabs standalone-tabs">
      <button [class.active]="!archived()" (click)="archived.set(false)">
        Growing <span>{{ tracker.active().length }}</span></button
      ><button [class.active]="archived()" (click)="archived.set(true)">
        Archived <span>{{ tracker.data().activities.length - tracker.active().length }}</span>
      </button>
    </div>
    <button class="text-button compact-toggle" (click)="tracker.update(compactChange)">
      {{ tracker.data().preferences.compact ? 'Comfortable view' : 'Compact view' }}
    </button>
    <section class="panel" [class.compact-list]="tracker.data().preferences.compact">
      @for (a of list(); track a.id) {
        @if (archived()) {
          <div class="activity-row">
            <span class="activity-emoji">{{ a.icon }}</span
            ><a class="activity-info" [routerLink]="['/activities', a.id]"
              ><h3>{{ a.name }}</h3>
              <span>Archived · history preserved</span></a
            ><button class="btn" (click)="tracker.archive(a)">Restore</button>
          </div>
        } @else {
          <app-activity-card [activity]="a" [organize]="true" [reorder]="sort() === 'custom'" />
        }
      } @empty {
        <app-empty
          [title]="
            search() || category()
              ? 'Nothing in this little corner.'
              : archived()
                ? 'A fresh, empty archive.'
                : 'What would you like to grow?'
          "
          description="Try a different filter, or start an activity that feels like you."
          action="New activity"
          (activate)="create.set(true)"
        />
      }
    </section>
    @if (create()) {
      <app-activity-form (close)="create.set(false)" />
    }`,
})
export class Activities {
  tracker = inject(TrackerService);
  compactChange = (d: import('../../models/tracker').AppData) => {
    d.preferences.compact = !d.preferences.compact;
  };
  create = signal(false);
  search = signal('');
  category = signal('');
  sort = signal('custom');
  archived = signal(false);
  list = computed(() =>
    this.tracker
      .data()
      .activities.filter(
        (a) =>
          a.archived === this.archived() &&
          (!this.category() || a.category === this.category()) &&
          (a.name + ' ' + a.description).toLowerCase().includes(this.search().toLowerCase()),
      )
      .sort(
        (a, b) =>
          Number(!!b.pinned) - Number(!!a.pinned) ||
          (this.sort() === 'custom'
            ? (a.order ?? 0) - (b.order ?? 0)
            : this.sort() === 'name'
              ? a.name.localeCompare(b.name)
              : this.sort() === 'streak'
                ? this.tracker.stats(b).current - this.tracker.stats(a).current
                : this.sort() === 'rate'
                  ? this.tracker.stats(b).rate - this.tracker.stats(a).rate
                  : b.updatedAt.localeCompare(a.updatedAt)),
      ),
  );
}
