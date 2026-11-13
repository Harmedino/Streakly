import { inject } from '@angular/core';
import { ApiService } from './api';
import { emptyLife } from '../models/life';
import { validateLife } from '../core/life-validation';
import { Injectable, signal } from '@angular/core';
import { AppData, emptyData } from '../models/tracker';
import { dateKey, validDate } from '../core/dates';
export const STORAGE_KEY = 'streakly.data.v1';
export const PRE_RESTORE_KEY = 'streakly.backup.before-restore';
export { validateData, migrateData, recoverRecords } from '../core/data-validation';
import { migrateData } from '../core/data-validation';
@Injectable({ providedIn: 'root' })
export class StorageService {
  private api = (() => {
    try {
      return inject(ApiService);
    } catch {
      return null;
    }
  })();
  readonly error = signal('');
  readonly recovery = signal<string | null>(null);
  private readFailed = false;
  private baseline: string | null = null;
  readonly external = signal<AppData | null>(null);
  constructor() {
    window.addEventListener('storage', this.onStorage);
  }
  ngOnDestroy() {
    window.removeEventListener('storage', this.onStorage);
  }
  private onStorage = (event: StorageEvent) => {
    if (this.api?.enabled()) return;
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    if (!event.newValue) {
      this.error.set(
        'Saved data was removed in another tab. Export your current data before making further changes.',
      );
      return;
    }
    try {
      const data = migrateData(JSON.parse(event.newValue));
      this.baseline = event.newValue;
      this.readFailed = false;
      this.error.set('');
      this.external.set(data);
    } catch {
      this.error.set(
        'Another tab wrote unreadable data. Your current view is preserved. Export a backup before reloading.',
      );
    }
  };
  load(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.baseline = raw;
      this.recovery.set(raw);
      const data = raw ? migrateData(JSON.parse(raw)) : emptyData();
      this.recovery.set(null);
      return data;
    } catch {
      this.readFailed = true;
      this.error.set(
        'Your saved data could not be read. It has been kept untouched. Export or import a backup in Settings before saving new changes.',
      );
      return emptyData();
    }
  }
  safetyBackup(): string | null {
    try {
      return localStorage.getItem(PRE_RESTORE_KEY);
    } catch {
      return null;
    }
  }
  save(data: AppData, replaceCorrupt = false): boolean {
    if (this.readFailed && !replaceCorrupt) return false;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== this.baseline) {
        this.error.set(
          'Data changed in another tab. Reload to use the latest version; your attempted change was not saved.',
        );
        return false;
      }
      const raw = JSON.stringify(data);
      if (replaceCorrupt) {
        const current = localStorage.getItem(STORAGE_KEY);
        if (current !== null) localStorage.setItem(PRE_RESTORE_KEY, current);
      }
      localStorage.setItem(STORAGE_KEY, raw);
      this.baseline = raw;
      this.readFailed = false;
      this.recovery.set(null);
      this.error.set('');
      return true;
    } catch {
      this.error.set(
        'Browser storage is unavailable or full. This change was not saved. Replacement also requires room for a safety backup. Export a backup or free up browser storage.',
      );
      return false;
    }
  }
}
