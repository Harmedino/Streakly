import { FormsModule } from '@angular/forms';
import { BreakControls } from '../../shared/break-controls';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrackerService } from '../../services/tracker';
import { scheduleLabel } from '../../core/streaks';
import { monthStart, prettyDate } from '../../core/dates';
import { Icon } from '../../shared/icon';
import { Heatmap } from '../../shared/heatmap';
import { Calendar } from '../../shared/calendar';
import { ActivityForm } from '../../shared/activity-form';
import { RecordForm } from '../../shared/record-form';
import { ConfirmDialog } from '../../shared/dialog';
import { EmptyState, Progress } from '../../shared/ui';
@Component({
  selector: 'app-detail',
  imports: [
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
  template: `@if (activity(); as a) {
      <a class="back-link" routerLink="/activities"
        ><app-icon name="left" [size]="16" />All activities</a
      >
      <div class="page-heading detail-heading">
        <div class="detail-title">
          <span class="detail-emoji" [style.background]="a.color + '20'">{{ a.icon }}</span>
          <div>
            <div class="eyebrow">
              {{ a.category }} · {{ a.archived ? 'ARCHIVED' : schedule(a) }}
            </div>
            <h1>{{ a.name }}</h1>
            <p>{{ a.description || 'One small action, repeated with intention.' }}</p>
          </div>
        </div>
        <button class="btn" (click)="edit.set(true)">
          Edit activity <app-icon name="up" [size]="16" />
        </button>
      </div>
      <div class="detail-stats">
        <div>
          <span>Current streak</span
          ><strong>{{ tracker.stats(a).current }} <app-icon name="flame" [size]="24" /></strong
          ><small>successful periods</small>
        </div>
        <div>
          <span>Personal best</span><strong>{{ tracker.stats(a).best }}</strong
          ><small>successful periods</small>
        </div>
        <div>
          <span>Total completions</span><strong>{{ tracker.stats(a).total }}</strong
          ><small>{{ tracker.stats(a).totalPeriods }} successful periods</small>
        </div>
        <div>
          <span>Completion rate</span><strong>{{ tracker.stats(a).rate }}<small>%</small></strong
          ><small>eligible tracking periods</small>
        </div>
      </div>
      <div class="dashboard-columns">
        <div>
          <section class="panel spaced-panel">
            <div class="section-heading">
              <div>
                <span class="eyebrow">YOUR STORY, ONE DAY AT A TIME</span>
                <h2>Little squares. Real progress.</h2>
              </div>
            </div>
            <app-heatmap [activityId]="a.id" (select)="selectDate($event)" />
          </section>
          <section class="panel spaced-panel">
            <div class="section-heading">
              <h2>Recent moments</h2>
              <span class="muted small">Click to edit</span>
            </div>
            @for (e of history(); track e.date) {
              <button class="history-row" (click)="selected.set(e.date)">
                <span class="history-check"><app-icon name="check" [size]="17" /></span
                ><span
                  ><strong>{{
                    pretty(e.date, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  }}</strong
                  ><small>{{ e.note || 'You showed up for yourself.' }}</small></span
                ><span>{{ e.quantity }} {{ a.unit }}<app-icon name="right" [size]="16" /></span>
              </button>
            } @empty {
              <app-empty
                title="Your story starts here."
                description="Complete this activity or add a past moment in the calendar."
              />
            }
          </section>
        </div>
        <aside>
          <section class="panel spaced-panel">
            <app-calendar
              [activityId]="a.id"
              [selected]="selected()"
              (select)="selectDate($event)"
            />
            <p class="helper">Select a past or current date to edit your progress.</p>
          </section>
          <section class="panel spaced-panel">
            <span class="eyebrow">TAKE A BREATHER</span>
            <h2>Rest & streak protection</h2>
            <button class="btn" (click)="tracker.pause(a)">{{ pauseLabel() }}</button>
            <label class="break-date"
              >Choose a date<input type="date" [(ngModel)]="breakDate" [min]="a.startDate"
            /></label>
            <app-break-controls [activity]="a" [date]="breakDate" />
            <div class="break-history">
              <h3>Break history</h3>
              @for (d of a.freezes ?? []; track d) {
                <button class="text-button" (click)="breakDate = d">
                  ◇ {{ pretty(d) }} · Freeze
                </button>
              }
              @for (d of a.restDays ?? []; track d) {
                <button class="text-button" (click)="breakDate = d">
                  — {{ pretty(d) }} · Planned rest
                </button>
              }
              @for (p of a.pauses ?? []; track p.start) {
                <p class="helper">
                  Ⅱ {{ pretty(p.start) }} – {{ p.end ? pretty(p.end) : 'Until resumed' }} · Paused
                </p>
              }
            </div>
          </section>
          <section class="panel spaced-panel">
            <span class="eyebrow">THIS MONTH</span>
            <h2>{{ monthCount() }} little wins</h2>
            <app-progress [value]="monthProgress()" />
            <p class="helper">
              {{
                a.frequency === 'monthly'
                  ? a.periodTarget + ' days is your monthly target.'
                  : 'Completed days since the start of this month.'
              }}
            </p>
            <dl class="schedule-list">
              <div>
                <dt>Schedule</dt>
                <dd>{{ schedule(a) }}</dd>
              </div>
              <div>
                <dt>Daily goal</dt>
                <dd>{{ a.quantityTarget }} {{ a.unit || 'completion' }}</dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>{{ pretty(a.startDate) }}</dd>
              </div>
              <div>
                <dt>Last completed</dt>
                <dd>{{ tracker.stats(a).last ? pretty(tracker.stats(a).last!) : 'Not yet' }}</dd>
              </div>
              <div>
                <dt>Reminder preference</dt>
                <dd>{{ a.reminder || 'None' }}</dd>
              </div>
            </dl>
          </section>
          <div class="detail-actions">
            <button class="btn" (click)="tracker.archive(a)">
              {{ a.archived ? 'Restore activity' : 'Archive activity' }}</button
            ><button class="text-button destructive" (click)="deleting.set(true)">
              Delete activity
            </button>
          </div>
        </aside>
      </div>
      @if (edit()) {
        <app-activity-form [activity]="a" (close)="edit.set(false)" />
      }
      @if (selected()) {
        <app-record-form [activity]="a" [date]="selected()" (close)="selected.set('')" />
      }
      @if (deleting()) {
        <app-confirm
          title="Let this activity go?"
          message="This permanently removes the activity and its entire history. Export a backup first if you would like to keep it."
          label="Delete activity"
          (cancel)="deleting.set(false)"
          (confirm)="remove()"
        />
      }
    } @else {
      <app-empty
        title="This activity isn't here."
        description="It may have been deleted or replaced by a backup."
      /><a class="btn" routerLink="/activities">Back to activities</a>
    }`,
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
  remove() {
    if (this.tracker.delete(this.activity()!)) this.router.navigateByUrl('/activities');
  }
}
