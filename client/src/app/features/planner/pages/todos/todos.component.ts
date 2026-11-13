import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Todo } from '../../../../core/models/tracker';
import { TrackerService } from '../../../../core/services/tracker';
import { addDays, prettyDate, validDate } from '../../../../core/utils/dates';
import { ConfirmDialog } from '../../../../shared/components/dialog/index';
import { Icon } from '../../../../shared/components/icon/icon.component';
import { EmptyState, Progress } from '../../../../shared/components/ui/index';
@Component({
  selector: 'app-todos',
  imports: [FormsModule, RouterLink, Icon, EmptyState, Progress, ConfirmDialog],
  templateUrl: './todos.component.html',
  styleUrl: './todos.component.scss',
})
export class Todos {
  tracker = inject(TrackerService);
  route = inject(ActivatedRoute);
  goalId = this.route.snapshot.queryParamMap.get('goal') ?? '';
  milestoneId = this.route.snapshot.queryParamMap.get('milestone') ?? '';
  syncMilestone = false;
  editGoalId = '';
  editMilestoneId = '';
  editSyncMilestone = false;
  title = '';
  dueDate = '';
  scheduledDate = this.tracker.today();
  priority: 'low' | 'medium' | 'high' = 'medium';
  scope = signal('all');
  editScheduledDate = '';
  editPriority: 'low' | 'medium' | 'high' = 'medium';
  todayTasks = computed(() =>
    this.tasks().filter((t) => (t.scheduledDate || t.dueDate) === this.tracker.today()),
  );
  dailyProgress = computed(() =>
    this.todayTasks().length
      ? Math.round(
          (this.todayTasks().filter((t) => t.done).length / this.todayTasks().length) * 100,
        )
      : 0,
  );
  error = '';
  filter = signal<'all' | 'pending' | 'done'>('pending');
  editing = signal<Todo | null>(null);
  editTitle = '';
  editDueDate = '';
  editError = '';
  deleting = signal<Todo | null>(null);
  clearing = signal(false);
  pretty = prettyDate;
  isDoneTask = (t: Todo) => t.done;
  tasks = computed(() => this.tracker.data().todos ?? []);
  done = computed(() => this.tasks().filter((t) => t.done).length);
  remaining = computed(() => this.tasks().length - this.done());
  progress = computed(() =>
    this.tasks().length ? Math.round((this.done() / this.tasks().length) * 100) : 0,
  );
  list = computed(() =>
    this.tasks()
      .filter(
        (t) =>
          (this.filter() === 'all' || (this.filter() === 'done') === t.done) &&
          (this.scope() === 'all' ||
            (this.scope() === 'today' && (t.scheduledDate || t.dueDate) === this.tracker.today()) ||
            (this.scope() === 'upcoming' &&
              (t.scheduledDate || t.dueDate) > this.tracker.today()) ||
            (this.scope() === 'overdue' &&
              !t.done &&
              !!(t.dueDate || t.scheduledDate) &&
              (t.dueDate || t.scheduledDate!) < this.tracker.today())),
      )
      .slice()
      .sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          { high: 0, medium: 1, low: 2 }[a.priority ?? 'medium'] -
            { high: 0, medium: 1, low: 2 }[b.priority ?? 'medium'] ||
          (a.dueDate || '9999').localeCompare(b.dueDate || '9999') ||
          b.createdAt.localeCompare(a.createdAt),
      ),
  );
  async add() {
    this.error = '';
    if (!this.title.trim()) {
      this.error = 'Give your task a name.';
      return;
    }
    if (this.dueDate && !validDate(this.dueDate)) {
      this.error = 'Choose a valid due date.';
      return;
    }
    if (
      this.tracker.addTodo(
        this.title,
        this.dueDate,
        this.scheduledDate,
        this.priority,
        this.goalId,
        this.milestoneId,
        this.syncMilestone,
      ) &&
      (await this.tracker.settled())
    ) {
      this.title = '';
      this.dueDate = '';
      this.filter.set('pending');
    }
  }
  edit(todo: Todo) {
    this.editing.set(structuredClone(todo));
    this.editTitle = todo.title;
    this.editDueDate = todo.dueDate;
    this.editScheduledDate = todo.scheduledDate ?? '';
    this.editPriority = todo.priority ?? 'medium';
    this.editGoalId = todo.goalId ?? '';
    this.editMilestoneId = todo.milestoneId ?? '';
    this.editSyncMilestone = todo.syncMilestone ?? false;
    this.editError = '';
  }
  async save() {
    if (!this.editTitle.trim() || (this.editDueDate && !validDate(this.editDueDate))) {
      this.editError = 'Add a task name and a valid optional due date.';
      return;
    }
    if (
      this.tracker.editTodo(
        this.editing()!,
        this.editTitle,
        this.editDueDate,
        this.editScheduledDate,
        this.editPriority,
        this.editGoalId,
        this.editMilestoneId,
        this.editSyncMilestone,
      ) &&
      (await this.tracker.settled())
    )
      this.editing.set(null);
    else
      this.editError =
        this.tracker.api.error() ||
        this.tracker.storage.error() ||
        'This task changed. Cancel and reopen it to use the latest version.';
  }
  goals() {
    return this.tracker.data().life!.goals;
  }
  milestones(id: string) {
    return this.goals().find((g) => g.id === id)?.milestones ?? [];
  }
  goalTitle(id: string) {
    return this.goals().find((g) => g.id === id)?.title;
  }
  async tomorrow(task: Todo) {
    const date = addDays(this.tracker.today(), 1);
    if (!(
      this.tracker.editTodo(
        task,
        task.title,
        task.dueDate && task.dueDate < date ? date : task.dueDate,
        date,
      ) && (await this.tracker.settled())
    ))
      this.error = this.tracker.api.error() || 'Could not reschedule this task.';
  }
  async remove() {
    if (this.tracker.deleteTodo(this.deleting()!.id) && (await this.tracker.settled()))
      this.deleting.set(null);
  }
  async clear() {
    if (this.tracker.clearCompletedTodos() && (await this.tracker.settled()))
      this.clearing.set(false);
  }
}
