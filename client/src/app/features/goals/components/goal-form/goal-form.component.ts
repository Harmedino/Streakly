import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Goal } from '../../../../core/models/life';
import { goalTracking } from '../../../../core/utils/workflows';
import { Dialog } from '../../../../shared/components/dialog/dialog.component';
import { GoalsService } from '../../services/goals.service';
@Component({
  selector: 'app-goal-form',
  imports: [FormsModule, Dialog],
  templateUrl: './goal-form.component.html',
  styleUrl: './goal-form.component.scss',
})
export class GoalForm implements OnInit {
  service = inject(GoalsService);
  life = this.service.life;
  tracker = this.service.tracker;
  goal = input<Goal | null>(null);
  close = output<void>();
  error = signal('');
  value!: Goal;
  milestoneTitle = '';
  ngOnInit() {
    const g = this.goal();
    this.value = g
      ? structuredClone(g)
      : {
          id: crypto.randomUUID(),
          title: '',
          description: '',
          category: 'Personal',
          startDate: this.tracker.today(),
          deadline: '',
          priority: 'medium',
          progress: 0,
          status: 'active',
          milestones: [],
          activityId: '',
          savingsId: '',
          learningCategory: '',
          updatedOn: this.tracker.today(),
          tracking: 'simple',
          target: 1,
          current: 0,
          unit: '',
          source: 'manual',
        };
    this.value.tracking = goalTracking(this.value);
    this.value.source ??= 'manual';
    this.value.current ??= this.value.progress;
    this.value.target ??= 100;
  }
  sourceChanged() {
    this.value.unit = {
      manual: this.value.unit ?? '',
      applications: 'applications',
      learning: 'hours',
      savings: this.tracker.data().preferences.currency ?? 'NGN',
      streak: 'check-ins',
    }[this.value.source ?? 'manual'];
  }
  addMilestone() {
    if (!this.milestoneTitle.trim()) return;
    this.value.milestones.push({
      id: crypto.randomUUID(),
      title: this.milestoneTitle.trim(),
      done: false,
      completedOn: '',
      manualDone: false,
      deadline: '',
    });
    this.milestoneTitle = '';
    this.value.tracking = 'milestones';
  }
  removeMilestone(id: string) {
    this.value.milestones = this.value.milestones.filter((m) => m.id !== id);
  }
  async save() {
    this.error.set('');
    if (!this.value.title.trim()) {
      this.error.set('Give your goal a title.');
      return;
    }
    if (this.value.tracking === 'milestones' && !this.value.milestones.length) {
      this.error.set('Add at least one milestone, or choose simple completion.');
      return;
    }
    if (this.value.tracking !== 'numeric') this.value.source = 'manual';
    if (
      this.service.save({ ...this.value, title: this.value.title.trim() }) &&
      (await this.tracker.settled())
    )
      this.close.emit();
    else
      this.error.set(
        this.life.error() ||
          this.tracker.api.error() ||
          'Could not save this goal. Your edits are still here.',
      );
  }
}
