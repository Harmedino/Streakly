import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../../services/tracker';
import { validateData } from '../../services/storage';
import { AppData } from '../../models/tracker';
import { dateKey } from '../../core/dates';
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
              <span>{{ c }}</span>
            }
          </div>
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
      </div>
      <aside>
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
          STREAKLY · DATA VERSION 1<br />Small actions. Big consistency.
        </p>
      </aside>
    </div>
    @if (pending()) {
      <app-confirm
        title="Restore this chapter?"
        [message]="
          'This backup contains ' +
          pending()!.activities.length +
          ' activities and ' +
          pending()!.completions.length +
          ' recorded moments. Importing replaces all current data. Export a backup first to keep it.'
        "
        label="Replace with backup"
        (cancel)="pending.set(null)"
        (confirm)="import()"
      />
    }`,
})
export class Settings {
  tracker = inject(TrackerService);
  name = this.tracker.data().preferences.name;
  category = '';
  error = signal('');
  pending = signal<AppData | null>(null);
  saveName() {
    if (this.name.trim() && this.tracker.update((d) => (d.preferences.name = this.name.trim())))
      this.tracker.notify('Nice to see you, ' + this.name.trim() + '.');
  }
  theme(value: 'light' | 'dark') {
    this.tracker.update((d) => (d.preferences.theme = value));
  }
  addCategory() {
    const c = this.category.trim();
    if (c && !this.tracker.data().categories.includes(c))
      this.tracker.update((d) => d.categories.push(c));
    this.category = '';
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
      this.pending.set(validateData(JSON.parse(await file.text())));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'This backup could not be read.');
    }
    input.value = '';
  }
  import() {
    if (this.tracker.import(this.pending())) {
      this.name = this.tracker.data().preferences.name;
      this.pending.set(null);
    }
  }
}
