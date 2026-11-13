import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../../services/tracker';
import { Todo } from '../../models/tracker';
import { validDate, prettyDate } from '../../core/dates';
import { Icon } from '../../shared/icon';
import { EmptyState, Progress } from '../../shared/ui';
import { ConfirmDialog } from '../../shared/dialog';
@Component({
  selector: 'app-todos',
  imports: [FormsModule, Icon, EmptyState, Progress, ConfirmDialog],
  templateUrl: './todos.html',
  styleUrl: './todos.scss',
})
export class Todos {
  tracker = inject(TrackerService);
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
      this.tracker.addTodo(this.title, this.dueDate, this.scheduledDate, this.priority) &&
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
      ) &&
      (await this.tracker.settled())
    )
      this.editing.set(null);
    else
      this.editError =
        this.tracker.storage.error() ||
        'This task changed. Cancel and reopen it to use the latest version.';
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
