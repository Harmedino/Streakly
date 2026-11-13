import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api';
@Component({
  selector: 'app-account-access',
  imports: [FormsModule],
  templateUrl: './account-access.component.html',
  styleUrl: './account-access.component.scss',
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
