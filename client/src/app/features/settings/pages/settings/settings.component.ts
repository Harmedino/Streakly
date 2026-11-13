import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppData } from '../../../../core/models/tracker';
import { PwaService } from '../../../../core/services/pwa';
import { ReminderService } from '../../../../core/services/reminders';
import { recoverRecords, validateData } from '../../../../core/services/storage';
import { TrackerService } from '../../../../core/services/tracker';
import { dateKey } from '../../../../core/utils/dates';
import { ConfirmDialog } from '../../../../shared/components/dialog/index';
import { Icon } from '../../../../shared/components/icon/icon.component';
import { downloadFile } from '../../../../shared/download';
@Component({
  selector: 'app-settings',
  imports: [FormsModule, Icon, ConfirmDialog],
  styleUrl: './settings.component.scss',
  templateUrl: './settings.component.html',
})
export class Settings {
  tracker = inject(TrackerService);
  pwa = inject(PwaService);
  reminders = inject(ReminderService);
  name = this.tracker.data().preferences.name;
  currency = this.tracker.data().preferences.currency ?? 'NGN';
  timeZone =
    this.tracker.data().preferences.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  localeError = signal('');
  async saveLocale() {
    this.localeError.set('');
    try {
      new Intl.DateTimeFormat('en', { timeZone: this.timeZone }).format();
      const d = this.tracker.data();
      if (
        this.currency !== (d.preferences.currency ?? 'NGN') &&
        (d.life!.accounts.length || d.life!.transactions.length)
      )
        throw new Error(
          'Changing currency does not convert money. Export and reset Finance before choosing a new ledger currency.',
        );
      if (
        this.tracker.update((d) => {
          d.preferences.currency = this.currency;
          d.preferences.timeZone = this.timeZone;
        }) &&
        (await this.tracker.settled())
      )
        this.tracker.notify('Currency and calendar preferences saved.');
    } catch (e) {
      this.localeError.set(e instanceof Error ? e.message : 'Check your preferences.');
    }
  }
  category = '';
  editingCategory = '';
  categoryName = '';
  error = signal('');
  recoveryMessage = signal('');
  recover() {
    try {
      const r = recoverRecords(this.tracker.storage.recovery()!);
      this.recoveryMessage.set(
        `Recovery found ${r.data.activities.length} valid activities and ${r.data.completions.length} valid completions. It would discard ${r.discardedActivities} invalid activities and ${r.discardedCompletions} invalid completions and ${r.discardedTodos} invalid tasks. Export the original file before confirming.`,
      );
      this.pendingRevision = this.tracker.data().revision ?? 0;
      this.pending.set(r.data);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Recovery failed. Export the original data.');
    }
  }
  pending = signal<AppData | null>(null);
  pendingRevision = 0;
  resetChoice = 'finance';
  resetRevision = 0;
  resetting = signal(false);
  async downloadSafety() {
    if (this.tracker.api.enabled()) {
      try {
        downloadFile(
          JSON.stringify(await this.tracker.api.request('/backup/previous')),
          'streakly-server-safety-backup.json',
        );
      } catch (e) {
        this.error.set(e instanceof Error ? e.message : 'Backup unavailable.');
      }
      return;
    }
    const backup = this.tracker.storage.safetyBackup();
    if (backup) downloadFile(backup, 'streakly-pre-restore-' + dateKey() + '.json');
  }
  async reset(typed = '') {
    if (this.resetChoice === 'all' && typed !== 'RESET') return;
    if (this.tracker.api.enabled()) {
      if (await this.tracker.api.reset(this.resetChoice, typed)) {
        this.resetting.set(false);
        this.tracker.notify('Selected records reset. A server backup was created first.');
      }
      return;
    }
    if (
      (this.tracker.data().revision ?? 0) !== this.resetRevision ||
      this.tracker.storage.external()
    ) {
      this.resetting.set(false);
      this.error.set('Data changed while confirmation was open. Review and retry.');
      return;
    }
    try {
      if (this.tracker.resetSection(this.resetChoice)) {
        this.resetting.set(false);
        this.tracker.notify('Selected records reset. A pre-reset safety backup is available.');
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Reset failed. No changes were saved.');
    }
  }

  saveName() {
    if (this.name.trim() && this.tracker.update((d) => (d.preferences.name = this.name.trim())))
      this.tracker.notify('Nice to see you, ' + this.name.trim() + '.');
  }
  theme(value: 'light' | 'dark') {
    this.tracker.update((d) => (d.preferences.theme = value));
  }
  addCategory() {
    if (this.tracker.addCategory(this.category)) this.category = '';
  }
  renameCategory() {
    if (this.tracker.renameCategory(this.editingCategory, this.categoryName))
      this.editingCategory = '';
  }
  export() {
    const blob = new Blob(
      [this.tracker.storage.recovery() ?? JSON.stringify(this.tracker.data(), null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'streakly-backup-' + dateKey() + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.tracker.notify('A little peace of mind. Backup exported.');
  }
  async readFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.error.set('');
    if (!file) return;
    try {
      if (file.size > (this.tracker.api.enabled() ? 8 : 20) * 1024 * 1024)
        throw new Error('Choose a backup smaller than 20 MB.');
      const validated = validateData(JSON.parse(await file.text()));
      this.pendingRevision = this.tracker.data().revision ?? 0;
      this.pending.set(validated);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'This backup could not be read.');
    }
    input.value = '';
  }
  async import() {
    if (
      (this.tracker.data().revision ?? 0) !== this.pendingRevision ||
      this.tracker.storage.external()
    ) {
      this.pending.set(null);
      this.error.set(
        'Your data changed while the import confirmation was open. Select the backup again to confirm against the latest data.',
      );
      return;
    }
    if (this.tracker.import(this.pending()) && (await this.tracker.settled())) {
      this.name = this.tracker.data().preferences.name;
      this.pending.set(null);
    }
  }
}
