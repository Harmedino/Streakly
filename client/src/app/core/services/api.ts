import { Injectable, signal } from '@angular/core';
import { AppData } from '../models/tracker';
@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly expired = signal(false);
  readonly migrated = signal(false);
  readonly enabled = signal(false);
  readonly ready = signal(false);
  readonly user = signal<{ id: string; email: string } | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly snapshot = signal<AppData | null>(null);
  csrf = '';
  private pending: Promise<boolean> = Promise.resolve(true);
  constructor() {
    void this.boot();
  }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      signal: AbortSignal.timeout(20000),
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(this.csrf ? { 'X-CSRF-Token': this.csrf } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let result: any;
    try {
      result = await response.json();
    } catch {
      throw new Error('The server returned an unreadable response. Your changes were not saved.');
    }
    if (!response.ok || !result.ok) {
      if (response.status === 401) {
        if (this.user()) this.expired.set(true);
        else this.user.set(null);
      }
      throw new Error(
        result.error?.message || 'The server could not save this change. Retry when connected.',
      );
    }
    return result.data as T;
  }
  private serverRequired() {
    try {
      return !!localStorage.getItem('streakly.server-required');
    } catch {
      return false;
    }
  }
  async boot() {
    this.error.set('');
    try {
      await this.request('/health');
      this.enabled.set(true);
      await this.session();
    } catch (e) {
      if (this.serverRequired() || document.querySelector('meta[name=streakly-backend]')) {
        this.enabled.set(true);
        this.error.set(
          'Cannot connect to your server. Your account data has not been replaced with browser data. Retry connection.',
        );
      }
    } finally {
      this.ready.set(true);
    }
  }
  async session() {
    const session = await this.request<{
      user: { id: string; email: string };
      csrf: string;
    } | null>('/auth/session');
    this.csrf = session?.csrf ?? '';
    if (session) {
      await this.refresh(true);
      this.user.set(session.user);
    } else this.user.set(null);
  }
  async sign(mode: 'login' | 'signup', email: string, password: string) {
    const previous = this.user();
    try {
      const result = await this.request<{ user: { id: string; email: string }; csrf: string }>(
        '/auth/' + mode,
        'POST',
        { email, password },
      );
      this.csrf = result.csrf;
      if (this.expired() && previous && previous.id !== result.user.id) {
        await this.request('/auth/logout', 'POST', {});
        throw new Error('Sign in to ' + previous.email + ' to recover this open form.');
      }
      const data = await this.request<AppData>('/workspace');
      this.migrated.set(
        (await this.request<{ completed: boolean }>('/migration/status')).completed,
      );
      this.snapshot.set(data);
      this.user.set(result.user);
      this.expired.set(false);
      this.error.set('');
      try {
        localStorage.setItem('streakly.server-required', 'true');
      } catch {
        /* A blocked preference store does not prevent server access. */
      }
    } catch (error) {
      if (!this.expired()) this.user.set(null);
      throw error;
    }
  }
  async refresh(throwOnError = false) {
    try {
      const [data, status] = await Promise.all([
        this.request<AppData>('/workspace'),
        this.request<{ completed: boolean }>('/migration/status'),
      ]);
      this.migrated.set(status.completed);
      this.snapshot.set(data);
      this.error.set('');
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Cannot refresh the server workspace. Retry when connected.',
      );
      if (throwOnError) throw error;
    }
  }
  async logout() {
    try {
      await this.request('/auth/logout', 'POST', {});
      this.user.set(null);
      this.expired.set(false);
      this.migrated.set(false);
      this.csrf = '';
      this.snapshot.set(null);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Could not sign out. Retry when connected.',
      );
    }
  }
  write(data: AppData, revision: number, backup = false) {
    if (this.busy()) return false;
    this.busy.set(true);
    this.error.set('');
    this.pending = this.request<AppData>('/workspace', 'PUT', {
      data,
      expectedRevision: revision,
      backup,
    })
      .then((d) => {
        this.snapshot.set(d);
        return true;
      })
      .catch((e) => {
        this.error.set(e.message || 'Could not save. Your previous records are safe.');
        return false;
      })
      .finally(() => this.busy.set(false));
    return true;
  }
  clearCompleted(revision: number) {
    if (this.busy()) return false;
    this.busy.set(true);
    this.error.set('');
    this.pending = this.request<AppData>('/planner/clear-completed', 'POST', {
      expectedRevision: revision,
      confirm: true,
    })
      .then((data) => {
        this.snapshot.set(data);
        return true;
      })
      .catch((e) => {
        this.error.set(e.message || 'Could not clear completed tasks.');
        return false;
      })
      .finally(() => this.busy.set(false));
    return true;
  }
  settled() {
    return this.pending;
  }
  async reset(section: string, typed: string) {
    if (this.busy()) return false;
    this.error.set('');
    this.busy.set(true);
    try {
      this.snapshot.set(
        await this.request<AppData>('/reset', 'POST', {
          section,
          typed,
          confirm: true,
          expectedRevision: this.snapshot()?.revision ?? 0,
        }),
      );
      return true;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Reset failed.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
