import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TrackerService } from '../../../../core/services/tracker';
import { monthStart, prettyDate } from '../../../../core/utils/dates';
import { scheduleLabel } from '../../../../core/utils/streaks';
import { ActivityForm } from '../../../../shared/components/activity-form/activity-form.component';
import { BreakControls } from '../../../../shared/components/break-controls/break-controls.component';
import { Calendar } from '../../../../shared/components/calendar/calendar.component';
import { ConfirmDialog } from '../../../../shared/components/dialog/index';
import { Heatmap } from '../../../../shared/components/heatmap/heatmap.component';
import { Icon } from '../../../../shared/components/icon/icon.component';
import { MarkStreak } from '../../../../shared/components/mark-streak/mark-streak.component';
import { RecordForm } from '../../../../shared/components/record-form/record-form.component';
import { EmptyState, Progress } from '../../../../shared/components/ui/index';
@Component({
  selector: 'app-detail',
  imports: [
    MarkStreak,
    FormsModule,
    BreakControls,
    RouterLink,
    Icon,
    Heatmap,
    Calendar,
    ActivityForm,
    RecordForm,
    ConfirmDialog,
    EmptyState,
    Progress,
  ],
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.scss',
})
export class Detail {
  tracker = inject(TrackerService);
  breakDate = this.tracker.today();
  pauseLabel() {
    return this.activity()?.pauses?.some((p) => p.end === null)
      ? 'Resume activity'
      : 'Pause activity';
  }
  route = inject(ActivatedRoute);
  router = inject(Router);
  params = toSignal(this.route.paramMap);
  edit = signal(false);
  selected = signal('');
  deleting = signal(false);
  pretty = prettyDate;
  schedule = scheduleLabel;
  activity = computed(() =>
    this.tracker.data().activities.find((a) => a.id === this.params()?.get('id')),
  );
  history = computed(() =>
    this.tracker
      .data()
      .completions.filter((e) => e.activityId === this.activity()?.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20),
  );
  monthCount = computed(
    () =>
      this.tracker
        .data()
        .completions.filter(
          (e) =>
            e.activityId === this.activity()?.id &&
            e.date >= monthStart(this.tracker.today()) &&
            e.date <= this.tracker.today() &&
            e.quantity >= this.activity()!.quantityTarget,
        ).length,
  );
  monthProgress = computed(() =>
    Math.min(
      100,
      (this.monthCount() /
        (this.activity()?.frequency === 'monthly'
          ? this.activity()!.periodTarget
          : Number(this.tracker.today().slice(-2)))) *
        100,
    ),
  );
  selectDate(d: string) {
    if (d < this.activity()!.startDate)
      this.tracker.notify('This is before your activity started.');
    else this.selected.set(d);
  }
  async remove() {
    if (this.tracker.delete(this.activity()!) && (await this.tracker.settled()))
      this.router.navigateByUrl('/activities');
  }
}
