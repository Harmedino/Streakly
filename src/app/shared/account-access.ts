import { Component, inject, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import { TrackerService } from '../services/tracker';
import { validateData, STORAGE_KEY } from '../services/storage';
import { downloadFile } from './download';
import { AppData } from '../models/tracker';
@Component({
  selector: 'app-account-access',
  imports: [FormsModule],
  template: ` <div class="account-access">
    <section class="panel spaced-panel">
      <span class="eyebrow">YOUR PRIVATE WORKSPACE</span>
      <h1>
        {{
          resetToken
            ? 'Choose a new password'
            : mode() === 'signup'
              ? 'Create your account'
              : mode() === 'forgot-password'
                ? 'Reset your password'
                : 'Welcome back'
        }}
      </h1>
      <p class="muted">
        @if (api.expired()) {
          Your session expired. Sign in again to recover your open form.
        }
        Sign in to securely save your workspace on your Streakly server. Existing browser records
        stay untouched.
      </p>
      <form (ngSubmit)="submit()" #form="ngForm">
        @if (!resetToken) {
          <label
            >Email<input
              type="email"
              name="email"
              [(ngModel)]="email"
              [readOnly]="api.expired()"
              required
              maxlength="254"
              autocomplete="email"
          /></label>
        }
        @if (mode() !== 'forgot-password' || resetToken) {
          <label
            >Password<input
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              minlength="12"
              maxlength="128"
              [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
          /></label>
          <p class="helper">Use at least 12 characters.</p>
        }
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        @if (message()) {
          <p class="notice" role="status">{{ message() }}</p>
        }
        <button class="btn primary full-width" [disabled]="form.invalid || busy()">
          {{
            busy()
              ? 'Please wait…'
              : resetToken
                ? 'Save new password'
                : mode() === 'signup'
                  ? 'Create account'
                  : mode() === 'forgot-password'
                    ? 'Send reset email'
                    : 'Sign in'
          }}
        </button>
      </form>
      @if (!resetToken && !api.expired()) {
        <div class="quick-actions">
          <button class="text-button" (click)="mode.set(mode() === 'signup' ? 'login' : 'signup')">
            {{ mode() === 'signup' ? 'Already registered? Sign in' : 'Create an account' }}</button
          ><button class="text-button" (click)="mode.set('forgot-password')">
            Forgot password?
          </button>
        </div>
      }
      @if (api.error()) {
        <p class="error">{{ api.error() }}</p>
        <button class="btn" (click)="api.boot()">Retry connection</button>
      }
    </section>
  </div>`,
  styles: `
    .account-access {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .panel {
      width: 100%;
      max-width: 460px;
    }
    h1 {
      font-size: 28px;
    }
    .quick-actions {
      margin: 16px 0 0;
      justify-content: space-between;
    }
  `,
})
export class AccountAccess {
  resetDone = output<void>();
  api = inject(ApiService);
  mode = signal<'login' | 'signup' | 'forgot-password'>('login');
  email = this.api.user()?.email ?? '';
  password = '';
  error = signal('');
  message = signal('');
  busy = signal(false);
  resetToken = new URLSearchParams(location.search).get('reset') || '';
  async submit() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.resetToken) {
        const r = await this.api.request<{ message: string }>('/auth/reset-password', 'POST', {
          token: this.resetToken,
          password: this.password,
        });
        this.message.set(r.message);
        this.resetToken = '';
        this.api.user.set(null);
        this.resetDone.emit();
        history.replaceState({}, '', location.pathname);
        this.mode.set('login');
        this.password = '';
      } else if (this.mode() === 'forgot-password') {
        const r = await this.api.request<{ message: string }>('/auth/forgot-password', 'POST', {
          email: this.email,
        });
        this.message.set(r.message);
      } else await this.api.sign(this.mode() as 'login' | 'signup', this.email, this.password);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Unable to connect.');
    } finally {
      this.busy.set(false);
    }
  }
}
@Component({
  selector: 'app-browser-migration',
  imports: [],
  template: `@if (raw && !api.migrated() && !dismissed()) {
    <section class="panel spaced-panel migration-panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">KEEP YOUR HISTORY</span>
          <h2>Bring your browser records with you</h2>
        </div>
        <button class="text-button" (click)="dismissed.set(true)" [disabled]="busy()">Later</button>
      </div>
      <p class="helper">
        This browser has an older workspace. Preview it, download a backup, then confirm its import.
        Browser storage will not be cleared.
      </p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (preview()) {
        <div class="migration-counts">
          @for (count of counts(); track count[0]) {
            <span>{{ count[1] }} {{ count[0] }}</span>
          }
        </div>
        <p class="notice">
          {{
            preview()!.alreadyMigrated
              ? 'These exact records are already imported.'
              : 'Existing server records are retained. Conflicting IDs stop the import for review.'
          }}
        </p>
        <button
          class="btn primary"
          [disabled]="busy() || !backedUp || preview()!.alreadyMigrated"
          (click)="migrate()"
        >
          {{ busy() ? 'Importing…' : 'Confirm import to my account' }}
        </button>
      }
      <div class="quick-actions">
        <button class="btn" (click)="backup()">Download original backup</button
        ><button class="btn" (click)="review()" [disabled]="busy()">Preview browser records</button>
      </div>
    </section>
  }`,
  styles: `
    .migration-panel {
      margin-bottom: 24px;
    }
    .migration-counts {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 16px 0;
    }
    .migration-counts span {
      padding: 6px 10px;
      background: var(--hover);
      font-size: 12px;
      border-radius: 5px;
    }
    .quick-actions {
      margin: 16px 0 0;
    }
  `,
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
