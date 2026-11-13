import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JournalEntry } from '../../../../core/models/life';
import { LifeService } from '../../../../core/services/life';
import { prettyDate } from '../../../../core/utils/dates';
import { Calendar } from '../../../../shared/components/calendar/calendar.component';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state.component';
import { JournalForm } from '../../components/journal-form/journal-form.component';
@Component({
  selector: 'app-journal',
  imports: [FormsModule, Calendar, ConfirmDialog, EmptyState, JournalForm],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.scss',
})
export class Journal {
  life = inject(LifeService);
  tracker = this.life.tracker;
  search = signal('');
  date = signal('');
  view = signal('timeline');
  editing = signal<JournalEntry | null | undefined>(undefined);
  deleting = signal<JournalEntry | null>(null);
  pretty = prettyDate;
  error = signal('');
  prompts = [
    { key: 'accomplished', label: 'Accomplished' },
    { key: 'learned', label: 'Learned' },
    { key: 'challenges', label: 'Challenges' },
    { key: 'ideas', label: 'Ideas' },
    { key: 'improve', label: 'Improve' },
    { key: 'tomorrow', label: 'Tomorrow' },
  ] as const;
  list = computed(() =>
    this.life
      .data()
      .journal.filter(
        (j) =>
          (!this.date() || j.date === this.date()) &&
          [j.content ?? '', ...this.prompts.map((p) => j[p.key])]
            .join(' ')
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  dates = computed(() => this.life.data().journal.map((j) => j.date));
  create() {
    const date = this.date() || this.tracker.today(),
      existing = this.life.data().journal.find((j) => j.date === date);
    this.editing.set(existing ?? null);
  }
  async remove() {
    if (this.life.remove('journal', this.deleting()!.id) && (await this.tracker.settled()))
      this.deleting.set(null);
    else this.error.set(this.life.error() || this.tracker.api.error());
  }
}
