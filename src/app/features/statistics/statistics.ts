import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrackerService } from '../../services/tracker';
import { Icon } from '../../shared/icon';
import { Heatmap } from '../../shared/heatmap';
import { EmptyState, Progress } from '../../shared/ui';
import { addDays, monthStart, parseDate, prettyDate, weekStart } from '../../core/dates';
import { isScheduled } from '../../core/streaks';
import { dailyCounts, rangeScore, weeklyReflection } from '../../core/insights';
@Component({
  selector: 'app-statistics',
  imports: [RouterLink, Icon, Heatmap, EmptyState, Progress],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">THE BIGGER PICTURE</span>
        <h1>Your habit insights<span class="greeting-dot">.</span></h1>
        <p>Understand your patterns and find a rhythm that lasts.</p>
      </div>
      <span class="pill"><span class="tiny-dot"></span>All time & recent insights</span>
    </div>
    <section class="panel spaced-panel weekly-reflection">
      <span class="eyebrow">YOUR WEEKLY REFLECTION</span>
      <h2>{{ reflection().score }}% of your targets, one small step at a time.</h2>
      <p>
        {{ reflection().completed }} activities completed this week ·
        {{ reflection().days }} successful tracking days · Best current streak:
        {{ currentBest() }} periods.
      </p>
      <p class="helper">
        Previous full week: {{ reflection().previous }} completions and
        {{ reflection().previousScore }}% consistency. This week so far:
        {{ reflection().change >= 0 ? '+' : '' }}{{ reflection().change }} completions compared with
        that full week.
      </p>
      @if (reflection().consistent; as a) {
        <a class="text-button" [routerLink]="['/activities', a.id]"
          >Most consistent this week: {{ a.name }} ↗</a
        >
      }
      @if (reflection().attention.length) {
        <p class="helper">
          A little attention:
          @for (a of reflection().attention; track a.id; let last = $last) {
            <a [routerLink]="['/activities', a.id]">{{ a.name }}</a
            >{{ last ? '' : ', ' }}
          }
        </p>
      }
    </section>
    <div class="detail-stats">
      <div>
        <span>This week</span><strong>{{ weekly() }}<small>%</small></strong
        ><small>weekly targets reached</small>
      </div>
      <div>
        <span>This month</span><strong>{{ monthly() }}<small>%</small></strong
        ><small>monthly consistency</small>
      </div>
      <div>
        <span>Total completions</span><strong>{{ total() }}</strong
        ><small>little wins, all time</small>
      </div>
      <div>
        <span>Longest streak</span><strong>{{ best() }}</strong
        ><small>successful periods</small>
      </div>
    </div>
    <div class="dashboard-columns">
      <div>
        <section class="panel spaced-panel">
          <div class="section-heading">
            <div>
              <span class="eyebrow">KEEP THE MOMENTUM</span>
              <h2>Your last 28 days</h2>
            </div>
            <span class="pill">{{ activeDays() }} active days</span>
          </div>
          <div class="trend-chart">
            @for (d of trend(); track d.date) {
              <div [attr.title]="pretty(d.date) + ': ' + d.count + ' completions'">
                <span
                  [style.height.%]="(d.count / max()) * 100"
                  [style.min-height.px]="d.count ? 6 : 2"
                ></span>
              </div>
            }
          </div>
          <div class="chart-caption">
            <span>{{ pretty(trend()[0].date) }}</span
            ><span>Completed activities per day</span><span>{{ pretty(tracker.today()) }}</span>
          </div>
        </section>
        <section class="panel spaced-panel">
          <div class="section-heading">
            <h2>A landscape of little wins</h2>
            <app-icon name="sprout" />
          </div>
          <app-heatmap (select)="explainDate($event)" />
        </section>
        <section class="panel spaced-panel">
          <div class="section-heading">
            <h2>Your rhythm, by weekday</h2>
            <span class="muted small">Completion rate · last 12 weeks</span>
          </div>
          <div class="weekday-insights">
            @for (d of weekdays(); track d.label) {
              <div>
                <span>{{ d.label }}</span
                ><app-progress [value]="d.rate" /><strong>{{ d.rate }}%</strong>
              </div>
            }
          </div>
        </section>
      </div>
      <aside>
        <section class="consistency-panel">
          <app-icon name="target" [size]="28" /><span class="eyebrow">OVERALL CONSISTENCY</span
          ><strong>{{ score() }}<small>%</small></strong>
          <p>Progress is a practice.<br />Keep making room for it.</p>
          <span class="small">Based on your last 90 days of targets.</span>
        </section>
        <section class="panel spaced-panel">
          <span class="eyebrow">YOUR STEADIEST LITTLE HABIT</span>
          @if (consistent(); as a) {
            <div class="best-activity">
              <span>{{ a.icon }}</span>
              <h2>{{ a.name }}</h2>
              <strong>{{ tracker.stats(a).rate }}% consistency</strong
              ><a class="text-button" [routerLink]="['/activities', a.id]"
                >See its story <app-icon name="up" [size]="16"
              /></a>
            </div>
          } @else {
            <app-empty
              title="Your rhythm is finding you."
              description="Track an activity to discover what sticks."
            />
          }
        </section>
        <div class="insight-note">
          <app-icon name="leaf" />
          <p>A missed day is just a day.<br />Your next small step still counts.</p>
        </div>
      </aside>
    </div>`,
})
export class Statistics {
  tracker = inject(TrackerService);
  reflection = computed(() => weeklyReflection(this.tracker.data(), this.tracker.today()));
  currentBest = computed(() =>
    Math.max(0, ...this.tracker.active().map((a) => this.tracker.stats(a).current)),
  );
  pretty = prettyDate;
  weekly = computed(() =>
    rangeScore(this.tracker.data(), weekStart(this.tracker.today()), this.tracker.today()),
  );
  monthly = computed(() =>
    rangeScore(this.tracker.data(), monthStart(this.tracker.today()), this.tracker.today()),
  );
  score = computed(() =>
    rangeScore(this.tracker.data(), addDays(this.tracker.today(), -89), this.tracker.today()),
  );
  total = computed(
    () =>
      this.tracker
        .data()
        .completions.filter(
          (e) =>
            e.date <= this.tracker.today() &&
            e.quantity >=
              (this.tracker.data().activities.find((a) => a.id === e.activityId)?.quantityTarget ??
                1),
        ).length,
  );
  best = computed(() =>
    Math.max(0, ...this.tracker.data().activities.map((a) => this.tracker.stats(a).best)),
  );
  trend = computed(() =>
    dailyCounts(this.tracker.data(), addDays(this.tracker.today(), -27), this.tracker.today()),
  );
  max = computed(() => Math.max(3, ...this.trend().map((d) => d.count)));
  activeDays = computed(() => this.trend().filter((d) => d.count > 0).length);
  consistent = computed(
    () =>
      this.tracker
        .active()
        .filter((a) => this.tracker.stats(a).total > 0)
        .sort((a, b) => this.tracker.stats(b).rate - this.tracker.stats(a).rate)[0],
  );
  weekdays = computed(() =>
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => {
      let total = 0,
        done = 0;
      for (const d of dailyCounts(
        this.tracker.data(),
        addDays(this.tracker.today(), -83),
        this.tracker.today(),
      )) {
        if ((parseDate(d.date).getDay() + 6) % 7 !== i) continue;
        for (const a of this.tracker.active()) {
          if (a.startDate > d.date) continue;
          const scheduled = isScheduled(a, d.date);
          if (scheduled) {
            total++;
            if (this.tracker.completed(a, d.date)) done++;
          }
        }
      }
      return { label, rate: total ? Math.round((done / total) * 100) : 0 };
    }),
  );
  explainDate(date: string) {
    this.tracker.notify(
      prettyDate(date) +
        ': ' +
        this.tracker
          .data()
          .completions.filter(
            (e) =>
              e.date === date &&
              e.quantity >=
                (this.tracker.data().activities.find((a) => a.id === e.activityId)
                  ?.quantityTarget ?? 1),
          ).length +
        ' completed activities. Edit history in Calendar.',
    );
  }
}
