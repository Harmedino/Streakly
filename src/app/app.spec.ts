import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { emptyData } from './models/tracker';
import { STORAGE_KEY } from './services/storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
describe('Application shell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const d = emptyData();
    d.preferences.onboarded = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.useRealTimers();
  });
  it('renders navigation and persists theme changes', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.brand').textContent).toContain('streakly');
    expect(fixture.nativeElement.querySelectorAll('nav a')).toHaveLength(4);
    fixture.componentInstance.toggleTheme();
    fixture.detectChanges();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).preferences.theme).toBe('dark');
  });
});
