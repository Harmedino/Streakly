import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LearningEntry } from '../../../../core/models/life';
import { LifeService } from '../../../../core/services/life';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state.component';
import { LearningEditor } from '../../../../shared/components/learning-editor/learning-editor.component';
import { Markdown } from '../../../../shared/components/markdown/markdown.component';
@Component({
  selector: 'app-learning',
  imports: [FormsModule, RouterLink, LearningEditor, Markdown, EmptyState, ConfirmDialog],
  templateUrl: './learning.component.html',
  styleUrl: './learning.component.scss',
})
export class Learning {
  life = inject(LifeService);
  tracker = this.life.tracker;
  route = inject(ActivatedRoute);
  search = signal('');
  category = signal(this.route.snapshot.queryParamMap.get('category') ?? '');
  sort = signal('newest');
  date = signal('');
  selectedId = signal(this.route.snapshot.queryParamMap.get('note') ?? '');
  editing = signal(this.route.snapshot.queryParamMap.has('goal'));
  creating = signal(this.route.snapshot.queryParamMap.has('goal'));
  initialGoal = this.route.snapshot.queryParamMap.get('goal') ?? '';
  deleting = signal<LearningEntry | null>(null);
  error = signal('');
  selected = computed(() => this.life.data().learning.find((n) => n.id === this.selectedId()));
  categories = computed(() => [
    ...new Set(
      this.life
        .data()
        .learning.flatMap((n) => [n.category, ...(n.tags ?? [])])
        .filter(Boolean),
    ),
  ]);
  list = computed(() =>
    this.life
      .data()
      .learning.filter(
        (n) =>
          (!this.category() ||
            n.category === this.category() ||
            n.tags?.includes(this.category())) &&
          (!this.date() || n.date === this.date()) &&
          (n.topic + ' ' + this.plain(n.description) + ' ' + (n.tags ?? []).join(' '))
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort(
        (a, b) =>
          Number(!!b.pinned) - Number(!!a.pinned) ||
          (this.sort() === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)),
      ),
  );
  plain(s: string) {
    return s
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  open(n: LearningEntry) {
    this.selectedId.set(n.id);
    this.creating.set(false);
    this.editing.set(false);
  }
  create() {
    this.selectedId.set('');
    this.creating.set(true);
    this.editing.set(true);
  }
  close() {
    this.editing.set(false);
    this.creating.set(false);
  }
  saved(id: string) {
    this.selectedId.set(id);
    this.creating.set(false);
  }
  async pin(n: LearningEntry) {
    if (!(this.life.saveLearning({ ...n, pinned: !n.pinned }) && (await this.tracker.settled())))
      this.error.set(this.life.error() || this.tracker.api.error());
  }
  async remove() {
    if (this.life.remove('learning', this.deleting()!.id) && (await this.tracker.settled())) {
      if (this.deleting()!.id === this.selectedId()) this.selectedId.set('');
      this.deleting.set(null);
    } else this.error.set(this.life.error() || this.tracker.api.error());
  }
  urls(s: string) {
    return s.split(/\s+/).filter(Boolean);
  }
  goalTitle(id: string) {
    return this.life.data().goals.find((g) => g.id === id)?.title;
  }
}
