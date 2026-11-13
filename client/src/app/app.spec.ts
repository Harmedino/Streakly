import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.component';
import { emptyData } from './core/models/tracker';
import { ApiService } from './core/services/api';
import { STORAGE_KEY } from './core/services/storage';
describe('Application shell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const d = emptyData();
    d.preferences.onboarded = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideServiceWorker('ngsw-worker.js', { enabled: false })],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.useRealTimers();
  });
  it('renders navigation and persists theme changes', async () => {
    TestBed.inject(ApiService).ready.set(true);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.brand').textContent).toContain('streakly');
    expect(fixture.nativeElement.querySelectorAll('.desktop-nav a')).toHaveLength(9);
    fixture.componentInstance.toggleTheme();
    fixture.detectChanges();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).preferences.theme).toBe('dark');
  });
});
