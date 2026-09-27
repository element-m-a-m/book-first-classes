import { defineConfig } from '@playwright/test';
import { E2E_PORT } from './test/e2e/port.js';

export default defineConfig({
  testDir: 'test/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    browserName: 'chromium',
    timezoneId: 'Asia/Jerusalem',
    locale: 'he-IL',
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
  },
  webServer: {
    command: `node scripts/serve.mjs ${E2E_PORT}`,
    url: `http://127.0.0.1:${E2E_PORT}/package.json`,
    reuseExistingServer: false,
  },
});
