import { Component, input, output } from '@angular/core';
import { Icon } from './icon';
@Component({
  selector: 'app-empty',
  imports: [Icon],
  template: `<div class="empty">
    <div class="empty-symbol"><app-icon name="sprout" [size]="36" /></div>
    <h3>{{ title() }}</h3>
    <p>{{ description() }}</p>
    @if (action()) {
      <button class="btn primary" (click)="activate.emit()">
        <app-icon name="plus" [size]="17" />{{ action() }}
      </button>
    }
  </div>`,
})
export class EmptyState {
  title = input('Make room for a little growth.');
  description = input('Your next chapter starts with one small action.');
  action = input('');
  activate = output<void>();
}
@Component({
  selector: 'app-streak',
  imports: [Icon],
  template: `<span class="streak" [class.alive]="count() > 0"
    ><app-icon name="flame" [size]="16" />{{ count()
    }}<span class="sr-only"> successful periods in your current streak</span></span
  >`,
})
export class StreakCounter {
  count = input(0);
}
@Component({
  selector: 'app-progress',
  template: `<div
    class="progress-track"
    role="progressbar"
    aria-label="Completion progress"
    [attr.aria-valuenow]="value()"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <span [style.width.%]="value()"></span>
  </div>`,
})
export class Progress {
  value = input(0);
}
