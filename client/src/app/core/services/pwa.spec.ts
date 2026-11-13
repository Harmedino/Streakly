import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { afterEach, expect, it } from 'vitest';
import { PwaService } from './pwa';
afterEach(() => TestBed.resetTestingModule());
it('announces an available update without automatically reloading or changing saved data', () => {
  const versions = new Subject<VersionEvent>(),
    unrecoverable = new Subject<UnrecoverableStateEvent>();
  TestBed.configureTestingModule({
    providers: [
      { provide: SwUpdate, useValue: { isEnabled: true, versionUpdates: versions, unrecoverable } },
    ],
  });
  const original = localStorage.getItem('streakly.data.v1');
  const pwa = TestBed.inject(PwaService);
  expect(pwa.updateReady()).toBe(false);
  versions.next({
    type: 'VERSION_READY',
    currentVersion: { hash: 'old' },
    latestVersion: { hash: 'new' },
  });
  expect(pwa.updateReady()).toBe(true);
  expect(localStorage.getItem('streakly.data.v1')).toBe(original);
});
