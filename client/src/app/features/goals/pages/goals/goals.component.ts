import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Goal, GoalMilestone } from '../../../../core/models/life';
import { goalPercent, goalTracking } from '../../../../core/utils/workflows';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Dialog } from '../../../../shared/components/dialog/dialog.component';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state.component';
import { Progress } from '../../../../shared/components/progress/progress.component';
import { GoalCard } from '../../components/goal-card/goal-card.component';
import { GoalForm } from '../../components/goal-form/goal-form.component';
import { GoalsService } from '../../services/goals.service';
@Component({
  selector: 'app-goals',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    GoalCard,
    GoalForm,
    ConfirmDialog,
    Dialog,
    EmptyState,
    Progress,
  ],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss',
})
export class Goals {
  service = inject(GoalsService);
  life = this.service.life;
  tracker = this.service.tracker;
  route = inject(ActivatedRoute);
  router = inject(Router);
  id = signal('');
  filter = signal('all');
  search = signal('');
  editing = signal<Goal | null | undefined>(undefined);
  numeric = signal<Goal | null>(null);
  current = 0;
  error = signal('');
  deleting = signal<{ goal: Goal; milestone?: GoalMilestone } | null>(null);
  milestoneTitle = '';
  milestoneDate = '';
  milestoneEdit = '';
  editTitle = '';
  editDate = '';
  percent = goalPercent;
  tracking = goalTracking;
  goals = computed(() =>
    this.life
      .data()
      .goals.filter(
        (g) =>
          (this.filter() === 'all' ||
            (this.filter() === 'overdue'
              ? g.status === 'active' && !!g.deadline && g.deadline < this.tracker.today()
              : g.status === this.filter())) &&
          (g.title + ' ' + g.description).toLowerCase().includes(this.search().toLowerCase()),
      )
      .sort(
        (a, b) =>
          Number(a.status === 'completed') - Number(b.status === 'completed') ||
          (a.deadline || '9999').localeCompare(b.deadline || '9999'),
      ),
  );
  selected = computed(() => this.life.data().goals.find((g) => g.id === this.id()));
  history = computed(() =>
    this.life
      .data()
      .goalEvents.filter((e) => e.goalId === this.id())
      .slice()
      .reverse(),
  );
  notes = computed(() => this.life.data().learning.filter((n) => n.goalId === this.id()));
  tasks = computed(() => (this.tracker.data().todos ?? []).filter((t) => t.goalId === this.id()));
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((p) => this.id.set(p.get('id') || ''));
  }
  async action(ok: boolean) {
    if (ok && (await this.tracker.settled())) {
      this.error.set('');
      return true;
    }
    this.error.set(
      this.life.error() || this.tracker.api.error() || 'Could not save. Please retry.',
    );
    return false;
  }
  async complete(g: Goal) {
    await this.action(this.service.complete(g));
  }
  update(g: Goal) {
    this.current = g.current ?? g.progress;
    this.numeric.set(g);
  }
  async saveProgress() {
    const g = this.numeric()!;
    if (await this.action(this.service.save({ ...g, current: Number(this.current) })))
      this.numeric.set(null);
  }
  async addMilestone(g: Goal) {
    if (!this.milestoneTitle.trim()) return;
    const next = structuredClone(g);
    next.tracking = 'milestones';
    next.source = 'manual';
    next.milestones.push({
      id: crypto.randomUUID(),
      title: this.milestoneTitle.trim(),
      done: false,
      manualDone: false,
      completedOn: '',
      deadline: this.milestoneDate,
    });
    if (await this.action(this.service.save(next))) {
      this.milestoneTitle = '';
      this.milestoneDate = '';
    }
  }
  editMilestone(m: GoalMilestone) {
    this.milestoneEdit = m.id;
    this.editTitle = m.title;
    this.editDate = m.deadline ?? '';
  }
  async saveMilestone(g: Goal) {
    const next = structuredClone(g),
      m = next.milestones.find((m) => m.id === this.milestoneEdit)!;
    m.title = this.editTitle.trim();
    m.deadline = this.editDate;
    if (await this.action(this.service.save(next))) this.milestoneEdit = '';
  }
  async remove() {
    const d = this.deleting()!;
    if (d.milestone) {
      const next = structuredClone(d.goal);
      next.milestones = next.milestones.filter((m) => m.id !== d.milestone!.id);
      if (await this.action(this.service.save(next))) this.deleting.set(null);
    } else if (await this.action(this.life.remove('goals', d.goal.id))) {
      this.deleting.set(null);
      void this.router.navigateByUrl('/goals');
    }
  }
}
