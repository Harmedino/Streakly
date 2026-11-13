import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['pwa.spec.ts', 'backend.spec.ts', 'workflows.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env['STREAKLY_TEST_URL'] || 'http://localhost:4200',
    headless: true,
    timezoneId: 'Europe/London',
    launchOptions: {
      executablePath: process.env['CHROMIUM_PATH'] || '/usr/bin/chromium',
      args: ['--no-sandbox'],
    },
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
});
