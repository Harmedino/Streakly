import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
@Injectable({ providedIn: 'root' })
export class PwaService {
  private updates = inject(SwUpdate);
  readonly updateReady = signal(false);
  readonly installPrompt = signal<InstallPrompt | null>(null);
  private beforeInstall = (e: Event) => {
    e.preventDefault();
    this.installPrompt.set(e as InstallPrompt);
  };
  private installed = () => this.installPrompt.set(null);
  constructor() {
    window.addEventListener('beforeinstallprompt', this.beforeInstall);
    window.addEventListener('appinstalled', this.installed);
    if (this.updates.isEnabled)
      this.updates.unrecoverable.subscribe(() => this.updateReady.set(true));
    if (this.updates.isEnabled)
      this.updates.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') this.updateReady.set(true);
      });
  }
  async install() {
    const event = this.installPrompt();
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    this.installPrompt.set(null);
  }
  reload() {
    location.reload();
  }
  ngOnDestroy() {
    window.removeEventListener('beforeinstallprompt', this.beforeInstall);
    window.removeEventListener('appinstalled', this.installed);
  }
}
