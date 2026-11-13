import { Component, input, output } from '@angular/core';
import { prettyDate } from '../../../core/utils/dates';
import { Icon } from '../icon/icon.component';
import { Progress } from '../progress/progress.component';
@Component({
  selector: 'app-daily-focus',
  imports: [Icon, Progress],
  templateUrl: './daily-focus.component.html',
  styleUrl: './daily-focus.component.scss',
})
export class DailyFocus {
  date = input.required<string>();
  done = input(0);
  total = input(0);
  progress = input(0);
  active = input(0);
  best = input(0);
  mark = output<void>();
  pretty = prettyDate;
}
