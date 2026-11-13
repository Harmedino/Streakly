import { PwaService } from '../../services/pwa';
import { ReminderService } from '../../services/reminders';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../../services/tracker';
import { recoverRecords, validateData } from '../../services/storage';
import { AppData } from '../../models/tracker';
import { dateKey } from '../../core/dates';
import { downloadFile } from '../../shared/download';
import { Icon } from '../../shared/icon';
import { ConfirmDialog } from '../../shared/dialog';
@Component({
  selector: 'app-settings',
  imports: [FormsModule, Icon, ConfirmDialog],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>Your little corner<span class="greeting-dot">.</span></h1>
        <p>A space that feels like you. Progress that stays yours.</p>
      </div>
    </div>
    <div class="settings-layout">
      <div>
        <section class="panel settings-section">
          <span class="eyebrow">HELLO, YOU</span>
          <h2>A personal touch</h2>
          <form (ngSubmit)="saveName()" #form="ngForm">
            <label
              >What should we call you?<input
                name="displayName"
                [(ngModel)]="name"
                maxlength="80"
                placeholder="Your first name"
                required /></label
            ><button class="btn primary" [disabled]="form.invalid">Save name</button>
          </form>
        </section>
        <section class="panel settings-section">
          <span class="eyebrow">SET THE MOOD</span>
          <h2>Find your light</h2>
          <div class="theme-options">
            <button
              [class.selected]="tracker.data().preferences.theme === 'light'"
              (click)="theme('light')"
            >
              <span class="theme-preview light-preview"><i></i><i></i><i></i></span
              ><span><app-icon name="sun" [size]="17" />Daylight</span></button
            ><button
              [class.selected]="tracker.data().preferences.theme === 'dark'"
              (click)="theme('dark')"
            >
              <span class="theme-preview dark-preview"><i></i><i></i><i></i></span
              ><span><app-icon name="moon" [size]="17" />After hours</span>
            </button>
          </div>
        </section>
        <section class="panel settings-section">
          <span class="eyebrow">ROOM FOR YOUR OWN THING</span>
          <h2>Your categories</h2>
          <div class="category-tags">
            @for (c of tracker.data().categories; track c) {
              <button
                type="button"
                class="category-tag"
                [attr.aria-label]="'Rename category ' + c"
                (click)="editingCategory = c; categoryName = c"
              >
                {{ c }}<app-icon name="more" [size]="14" />
              </button>
            }
          </div>
          <p class="helper">
            Make your own categories below. Tap a category to rename it across your activities.
          </p>
          @if (editingCategory) {
            <form class="category-edit" (ngSubmit)="renameCategory()">
              <label
                >Rename {{ editingCategory
                }}<input name="categoryName" [(ngModel)]="categoryName" maxlength="60" required
              /></label>
              <div>
                <button type="button" class="btn" (click)="editingCategory = ''">Cancel</button
                ><button class="btn primary" [disabled]="!categoryName.trim()">
                  Save category
                </button>
              </div>
            </form>
          }
          <form class="inline-form" (ngSubmit)="addCategory()">
            <label class="sr-only" for="category">New category</label
            ><input
              id="category"
              name="category"
              [(ngModel)]="category"
              maxlength="60"
              placeholder="A new little category…"
            /><button class="btn" [disabled]="!category.trim()">Add category</button>
          </form>
        </section>
        <section class="panel settings-section">
          <span class="eyebrow">A CONSIDERED FRESH START</span>
          <h2>Reset a section</h2>
          <p class="muted">
            Export a full backup first. A local pre-reset backup is also required before anything is
            replaced.
          </p>
          <label
            >Section to reset<select [(ngModel)]="resetChoice">
              <option value="finance">Finance</option>
              <option value="learning">Learning journal</option>
              <option value="jobs">Job applications</option>
              <option value="goals">Goals</option>
              <option value="planner">Daily planner</option>
              <option value="journal">Personal journal & daily notes</option>
              <option value="streaks">Streaks & history</option>
              <option value="all">All application records</option>
            </select></label
          ><button
            class="btn danger"
            (click)="resetRevision = tracker.data().revision ?? 0; resetting.set(true)"
          >
            Reset selected section
          </button>
        </section>
      </div>
      <aside>
        <section class="panel settings-section">
          <span class="eyebrow">A LITTLE NUDGE</span>
          <h2>Your reminders</h2>
          <p class="muted">
            Set a time inside each activity. Reminders run while Streakly is open. There is no push
            service, so alerts are not reliable when the app is closed.
          </p>
          <p class="helper">
            Notification permission: {{ reminders.permission() }}. If notifications are blocked or
            unavailable, reminders appear inside the app.
          </p>
          @if (tracker.data().preferences.remindersEnabled) {
            <button class="btn" (click)="reminders.disable()">Disable reminders</button>
          } @else {
            <button class="btn" (click)="reminders.enable()">Enable reminders</button>
          }
        </section>
        <section class="panel settings-section">
          <span class="eyebrow">ALWAYS CLOSE BY</span>
          <h2>Take Streakly with you</h2>
          <p class="muted">
            Install for a focused, offline experience after the first online load.
          </p>
          @if (pwa.installPrompt()) {
            <button class="btn primary" (click)="pwa.install()">Install Streakly</button>
          } @else {
            <p class="helper">
              Use your browser’s Install option if available. On iPhone or iPad, use Safari → Share
              → Add to Home Screen. Offline support needs a production build served over HTTPS (or
              localhost).
            </p>
          }
        </section>
        <section class="panel settings-section">
          <app-icon name="download" [size]="27" />
          <h2>Your data, in your hands.</h2>
          <p class="muted">
            Everything is saved in this browser's LocalStorage. There is no account, server, or
            automatic sync between devices.
          </p>
          <p class="muted">
            Clearing browser data removes your history. Export a backup regularly, or move it to
            another browser.
          </p>
          @if (tracker.storage.recovery()) {
            <p class="notice">
              Your original saved data is protected. Export it first. Recovery keeps only records
              that pass validation, and requires confirmation.
            </p>
            <button class="btn full-width" (click)="recover()">Recover valid records</button>
          }
          @if (recoveryMessage()) {
            <p class="notice">{{ recoveryMessage() }}</p>
          }
          <button class="btn primary full-width" (click)="export()">
            <app-icon name="download" [size]="17" />Export JSON backup</button
          ><label class="btn full-width import-button"
            ><app-icon name="upload" [size]="17" />Import a backup<input
              type="file"
              accept="application/json,.json"
              (change)="readFile($event)"
          /></label>
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <button
            class="btn full-width"
            [disabled]="!tracker.storage.safetyBackup()"
            (click)="downloadSafety()"
          >
            Export last pre-restore backup
          </button>
          <p class="helper">
            Before any import or reset, the current stored data is kept as a safety backup in this
            browser. Export it here for safekeeping. A full browser clear removes this backup too.
          </p>
          <p class="helper">
            Imports are checked before they replace your current data. Maximum file size: 20 MB.
          </p>
        </section>
        <div class="note-panel">
          <app-icon name="leaf" [size]="26" />
          <h3>Built around you.</h3>
          <p>No feeds. No followers.<br />Just a little space to become.</p>
        </div>
        <p class="helper settings-version">
          STREAKLY · DATA VERSION 3<br />Small actions. Big consistency.
        </p>
      </aside>
    </div>
    @if (resetting()) {
      <app-confirm
        title="Reset these records?"
        [message]="
          'Reset ' +
          resetChoice +
          '? This removes its records and clears related links. A safety backup will be created first. Other sections stay intact unless you select all application records.'
        "
        label="Confirm reset"
        (cancel)="resetting.set(false)"
        (confirm)="reset()"
      />
    }
    @if (pending()) {
      <app-confirm
        title="Restore this chapter?"
        [message]="
          (recoveryMessage() ? recoveryMessage() + ' ' : '') +
          'This backup contains ' +
          pending()!.activities.length +
          ' activities and ' +
          pending()!.completions.length +
          ' recorded moments and ' +
          (pending()!.todos?.length ?? 0) +
          ' tasks, ' +
          (pending()!.life ? pending()!.life!.transactions.length : 0) +
          ' financial transactions and all included life records. A safety backup of current data will be created before replacement.'
        "
        label="Replace with backup"
        (cancel)="pending.set(null)"
        (confirm)="import()"
      />
    }`,
})
export class Settings {
  tracker = inject(TrackerService);
  pwa = inject(PwaService);
  reminders = inject(ReminderService);
  name = this.tracker.data().preferences.name;
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
  downloadSafety() {
    const backup = this.tracker.storage.safetyBackup();
    if (backup) downloadFile(backup, 'streakly-pre-restore-' + dateKey() + '.json');
  }
  reset() {
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
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a backup smaller than 20 MB.');
      const validated = validateData(JSON.parse(await file.text()));
      this.pendingRevision = this.tracker.data().revision ?? 0;
      this.pending.set(validated);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'This backup could not be read.');
    }
    input.value = '';
  }
  import() {
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
    if (this.tracker.import(this.pending())) {
      this.name = this.tracker.data().preferences.name;
      this.pending.set(null);
    }
  }
}
