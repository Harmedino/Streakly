import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: 'pwa.spec.ts',
  testIgnore: [],
  use: { ...base.use, baseURL: 'http://127.0.0.1:4201' },
  webServer: {
    command: 'node e2e/static-server.mjs',
    url: 'http://127.0.0.1:4201',
    reuseExistingServer: true,
  },
});
