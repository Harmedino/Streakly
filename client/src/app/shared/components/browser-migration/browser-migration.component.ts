import { Component, inject, signal } from '@angular/core';
import { AppData } from '../../../core/models/tracker';
import { ApiService } from '../../../core/services/api';
import { STORAGE_KEY, validateData } from '../../../core/services/storage';
import { TrackerService } from '../../../core/services/tracker';
import { downloadFile } from '../../download';
@Component({
  selector: 'app-browser-migration',
  imports: [],
  templateUrl: './browser-migration.component.html',
  styleUrl: './browser-migration.component.scss',
})
export class BrowserMigration {
  api = inject(ApiService);
  tracker = inject(TrackerService);
  raw = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  })();
  preview = signal<{ alreadyMigrated: boolean; counts: Record<string, number> } | null>(null);
  error = signal('');
  busy = signal(false);
  dismissed = signal(false);
  backedUp = false;
  data: AppData | null = null;
  counts = () => Object.entries(this.preview()?.counts ?? {}).filter(([, n]) => n > 0);
  backup() {
    if (this.raw) {
      downloadFile(this.raw, 'streakly-original-browser-backup.json');
      this.backedUp = true;
    }
  }
  async review() {
    this.busy.set(true);
    this.error.set('');
    try {
      this.data = validateData(JSON.parse(this.raw!));
      this.preview.set(await this.api.request('/migration/preview', 'POST', { data: this.data }));
    } catch (e) {
      this.error.set(
        e instanceof Error
          ? e.message
          : 'Could not validate this backup. Download it before making changes.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async migrate() {
    if (!this.data || !this.backedUp || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.api.snapshot.set(
        await this.api.request<AppData>('/migration', 'POST', {
          data: this.data,
          expectedRevision: this.api.snapshot()?.revision ?? 0,
          confirm: true,
        }),
      );
      this.api.migrated.set(true);
      this.dismissed.set(true);
      this.tracker.notify('Browser history imported. The server is now your source of truth.');
    } catch (e) {
      this.error.set(
        e instanceof Error ? e.message : 'Migration failed. Original records are unchanged.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
