import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon.component';
@Component({
  selector: 'app-streak',
  imports: [Icon],
  templateUrl: './streak-counter.component.html',
  styleUrl: './streak-counter.component.scss',
})
export class StreakCounter {
  count = input(0);
}
