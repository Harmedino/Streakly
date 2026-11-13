import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TrackerService } from '../../../../core/services/tracker';
import { ActivityCard } from '../../../../shared/components/activity-card/activity-card.component';
import { ActivityForm } from '../../../../shared/components/activity-form/activity-form.component';
import { Icon } from '../../../../shared/components/icon/icon.component';
import { EmptyState } from '../../../../shared/components/ui/index';
@Component({
  selector: 'app-activities',
  imports: [FormsModule, RouterLink, Icon, ActivityCard, ActivityForm, EmptyState],
  styleUrl: './activities.component.scss',
  templateUrl: './activities.component.html',
})
export class Activities {
  tracker = inject(TrackerService);
  compactChange = (d: import('../../../../core/models/tracker').AppData) => {
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
