import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: 'backend.spec.ts',
  testIgnore: [],
  timeout: 90000,
  use: {
    ...base.use,
    serviceWorkers: 'block',
    baseURL: process.env['STREAKLY_BACKEND_URL'] || 'http://127.0.0.1:3000',
  },
});
