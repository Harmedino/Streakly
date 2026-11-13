import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: ['backend.spec.ts', 'workflows.spec.ts'],
  testIgnore: [],
  timeout: 90000,
  use: {
    ...base.use,
    serviceWorkers: 'block',
    actionTimeout: 15000,
    baseURL: process.env['STREAKLY_BACKEND_URL'] || 'http://127.0.0.1:3000',
  },
});
