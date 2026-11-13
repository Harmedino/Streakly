import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LifeService } from '../../services/life';
import { lifeReport, previousRange, reportRange } from '../../core/life-reports';
import { groupMoney, naira } from '../../core/finance';
import { prettyDate, validDate } from '../../core/dates';
import { Progress } from '../../shared/ui';
@Component({
  selector: 'app-reports',
  imports: [FormsModule, RouterLink, Progress],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">YOUR LIFE, IN PERSPECTIVE</span>
        <h1>Your life reports<span class="greeting-dot">.</span></h1>
        <p>A clear view of what you actually recorded. No estimates presented as facts.</p>
      </div>
      <label class="month-picker"
        >Choose a date<input
          type="date"
          aria-label="Report date"
          [ngModel]="date()"
          (ngModelChange)="setDate($event)"
      /></label>
    </div>
    <div class="module-tabs">
      <button [class.active]="period() === 'week'" (click)="period.set('week')">
        Weekly report</button
      ><button [class.active]="period() === 'month'" (click)="period.set('month')">
        Monthly report
      </button>
    </div>
    <p class="helper">
      {{ pretty(range().start) }} – {{ pretty(range().end) }} · actual records through
      {{ pretty(end()) }}. Comparisons use the previous full {{ period() }}.
    </p>
    <div class="life-stats">
      <div>
        <span>Streak consistency</span><strong>{{ summary().consistency }}%</strong
        ><small>Previous {{ previous().consistency }}%</small>
      </div>
      <div>
        <span>Learning</span><strong>{{ (summary().learningMinutes / 60).toFixed(1) }} h</strong
        ><small>Previous {{ (previous().learningMinutes / 60).toFixed(1) }} h</small>
      </div>
      <div>
        <span>Applications</span><strong>{{ summary().applications }}</strong
        ><small>Previous {{ previous().applications }}</small>
      </div>
      <div>
        <span>Tasks completed</span><strong>{{ summary().tasksCompleted }}</strong
        ><small>Previous {{ previous().tasksCompleted }}</small>
      </div>
      <div>
        <span>Goals progressed</span><strong>{{ summary().goalsProgressed }}</strong
        ><small>{{ summary().goalsCompleted }} goals completed</small>
      </div>
    </div>
    <div class="life-stats">
      <div>
        <span>Income received</span><strong>{{ cash(summary().income) }}</strong
        ><small>Previous {{ cash(previous().income) }}</small>
      </div>
      <div>
        <span>Money spent</span><strong>{{ cash(summary().expenses) }}</strong
        ><small>Previous {{ cash(previous().expenses) }}</small>
      </div>
      <div>
        <span>Net cash flow</span><strong>{{ cash(summary().net) }}</strong
        ><small>Transfers excluded</small>
      </div>
      <div>
        <span>Net savings contributions</span><strong>{{ cash(summary().savedInPeriod) }}</strong
        ><small>Allocations minus withdrawals</small>
      </div>
      <div>
        <span>Available at period end</span><strong>{{ cash(summary().available) }}</strong
        ><small>From tracked balances</small>
      </div>
    </div>
    <div class="life-columns">
      <section class="panel spaced-panel">
        <h2>Biggest spending categories</h2>
        @for (group of categories(); track group.name) {
          <div class="distribution-row">
            <div>
              <span>{{ group.name }}</span
              ><strong>{{ cash(group.amount) }}</strong>
            </div>
            <app-progress
              [value]="summary().expenses ? (group.amount / summary().expenses) * 100 : 0"
            />
          </div>
        } @empty {
          <p class="helper">No recorded expenses in this period.</p>
        }
        <a class="text-button" routerLink="/finance" [queryParams]="{ tab: 'Reports' }"
          >Detailed finance reports & CSV ↗</a
        >
      </section>
      <section class="panel spaced-panel">
        <h2>Small actions add up</h2>
        <p class="report-summary">
          {{ summary().learningMinutes }} minutes of learning,
          {{ summary().applications }} applications, and {{ summary().tasksCompleted }} completed
          tasks.
        </p>
        <p class="helper">
          {{ summary().consistency }}% of recorded streak targets were reached.
          {{ summary().goalsProgressed }} goals moved forward through saved progress changes.
        </p>
        <p class="helper">
          Older tasks without a recorded completion date are kept in the planner, but excluded from
          dated completion reports. Goals are counted from progress history, not guessed from their
          current status.
        </p>
        <a class="text-button" routerLink="/statistics">Open detailed habit insights ↗</a>
      </section>
    </div>`,
})
export class Reports {
  life = inject(LifeService);
  tracker = this.life.tracker;
  date = signal(this.tracker.today());
  period = signal<'week' | 'month'>('week');
  pretty = prettyDate;
  cash = naira;
  range = computed(() => reportRange(this.period(), this.date()));
  end = computed(() =>
    this.range().end < this.tracker.today() ? this.range().end : this.tracker.today(),
  );
  summary = computed(() => lifeReport(this.tracker.data(), this.range().start, this.end()));
  previous = computed(() => {
    const range = previousRange(this.period(), this.date());
    return lifeReport(this.tracker.data(), range.start, range.end);
  });
  categories = computed(() =>
    groupMoney(
      this.life
        .data()
        .transactions.filter((t) => t.date >= this.range().start && t.date <= this.end()),
      'expense',
    ),
  );
  setDate(value: string) {
    if (validDate(value)) this.date.set(value);
  }
}
