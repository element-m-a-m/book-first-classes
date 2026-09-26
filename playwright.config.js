import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    timezoneId: 'Asia/Jerusalem',
    locale: 'he-IL',
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'node scripts/serve.mjs 4173',
    url: 'http://127.0.0.1:4173/package.json',
    reuseExistingServer: true,
  },
});
