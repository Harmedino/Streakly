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
  error = '';
  filter = signal<'all' | 'pending' | 'done'>('pending');
  editing = signal<Todo | null>(null);
  editTitle = '';
  editDueDate = '';
  editError = '';
  deleting = signal<Todo | null>(null);
  clearing = signal(false);
  pretty = prettyDate;
  tasks = computed(() => this.tracker.data().todos ?? []);
  done = computed(() => this.tasks().filter((t) => t.done).length);
  remaining = computed(() => this.tasks().length - this.done());
  progress = computed(() =>
    this.tasks().length ? Math.round((this.done() / this.tasks().length) * 100) : 0,
  );
  list = computed(() =>
    this.tasks()
      .filter((t) => this.filter() === 'all' || (this.filter() === 'done') === t.done)
      .slice()
      .sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          (a.dueDate || '9999').localeCompare(b.dueDate || '9999') ||
          b.createdAt.localeCompare(a.createdAt),
      ),
  );
  add() {
    this.error = '';
    if (!this.title.trim()) {
      this.error = 'Give your task a name.';
      return;
    }
    if (this.dueDate && !validDate(this.dueDate)) {
      this.error = 'Choose a valid due date.';
      return;
    }
    if (this.tracker.addTodo(this.title, this.dueDate)) {
      this.title = '';
      this.dueDate = '';
      this.filter.set('pending');
    }
  }
  edit(todo: Todo) {
    this.editing.set(structuredClone(todo));
    this.editTitle = todo.title;
    this.editDueDate = todo.dueDate;
    this.editError = '';
  }
  save() {
    if (!this.editTitle.trim() || (this.editDueDate && !validDate(this.editDueDate))) {
      this.editError = 'Add a task name and a valid optional due date.';
      return;
    }
    if (this.tracker.editTodo(this.editing()!, this.editTitle, this.editDueDate))
      this.editing.set(null);
    else
      this.editError =
        this.tracker.storage.error() ||
        'This task changed. Cancel and reopen it to use the latest version.';
  }
  remove() {
    if (this.tracker.deleteTodo(this.deleting()!.id)) this.deleting.set(null);
  }
  clear() {
    if (this.tracker.clearCompletedTodos()) this.clearing.set(false);
  }
}
