import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Activity } from '../../../../core/models/tracker';
import { TrackerService } from '../../../../core/services/tracker';
import { prettyDate, validDate } from '../../../../core/utils/dates';
import { STATUS_LABELS, calendarStatus } from '../../../../core/utils/streaks';
import { Calendar } from '../../../../shared/components/calendar/calendar.component';
import { DailyNote } from '../../../../shared/components/daily-note/daily-note.component';
import { Icon } from '../../../../shared/components/icon/icon.component';
import { RecordForm } from '../../../../shared/components/record-form/record-form.component';
import { EmptyState } from '../../../../shared/components/ui/index';
@Component({
  selector: 'app-calendar-page',
  imports: [DailyNote, FormsModule, RouterLink, Calendar, Icon, RecordForm, EmptyState],
  templateUrl: './calendar-page.component.html',
  styleUrl: './calendar-page.component.scss',
})
export class CalendarPage {
  tracker = inject(TrackerService);
  route = inject(ActivatedRoute);
  initialDate = this.route.snapshot.queryParamMap.get('date');
  filter = signal('');
  selected = signal(validDate(this.initialDate) ? this.initialDate : this.tracker.today());
  editing = signal<Activity | null>(null);
  pretty = prettyDate;
  activities = computed(() =>
    this.tracker
      .data()
      .activities.filter(
        (a) =>
          (!this.filter() || a.id === this.filter()) &&
          (!a.archived || this.filter()) &&
          this.selected() >= a.startDate,
      ),
  );
  status(a: Activity) {
    return STATUS_LABELS[
      calendarStatus(a, this.tracker.data().completions, this.selected(), this.tracker.today())
    ];
  }
}
