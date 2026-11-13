import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JournalEntry } from '../../../../core/models/life';
import { LifeService } from '../../../../core/services/life';
import { Dialog } from '../../../../shared/components/dialog/dialog.component';
@Component({
  selector: 'app-journal-form',
  imports: [FormsModule, Dialog],
  templateUrl: './journal-form.component.html',
  styleUrl: './journal-form.component.scss',
})
export class JournalForm implements OnInit {
  life = inject(LifeService);
  tracker = this.life.tracker;
  entry = input<JournalEntry | null>(null);
  initialDate = input('');
  close = output<void>();
  value!: JournalEntry;
  error = signal('');
  prompts = [
    { key: 'accomplished', label: 'What I accomplished' },
    { key: 'learned', label: 'What I learned' },
    { key: 'challenges', label: 'Challenges' },
    { key: 'ideas', label: 'Ideas' },
    { key: 'improve', label: 'What I want to improve' },
    { key: 'tomorrow', label: 'Tomorrow’s priorities' },
  ] as const;
  ngOnInit() {
    this.value = this.entry()
      ? structuredClone(this.entry()!)
      : {
          id: crypto.randomUUID(),
          date: this.initialDate() || this.tracker.today(),
          content: '',
          accomplished: '',
          learned: '',
          challenges: '',
          ideas: '',
          improve: '',
          tomorrow: '',
          mood: null,
        };
  }
  hasText() {
    return !!this.value.content?.trim() || this.prompts.some((p) => this.value[p.key].trim());
  }
  async save() {
    if (!this.hasText()) {
      this.error.set('Write a little about your day before saving.');
      return;
    }
    const stamp = new Date().toISOString();
    if (
      this.life.saveJournal({
        ...this.value,
        createdAt: this.value.createdAt || stamp,
        updatedAt: stamp,
      }) &&
      (await this.tracker.settled())
    )
      this.close.emit();
    else
      this.error.set(
        this.life.error() ||
          this.tracker.api.error() ||
          'Could not save. Your writing is still here.',
      );
  }
}
