import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Goal } from '../../../../core/models/life';
import { goalPercent, goalTracking } from '../../../../core/utils/workflows';
import { Progress } from '../../../../shared/components/progress/progress.component';
@Component({
  selector: 'app-goal-card',
  imports: [DecimalPipe, RouterLink, Progress],
  templateUrl: './goal-card.component.html',
  styleUrl: './goal-card.component.scss',
})
export class GoalCard {
  goal = input.required<Goal>();
  today = input.required<string>();
  complete = output<Goal>();
  update = output<Goal>();
  percent = goalPercent;
  tracking = goalTracking;
}
