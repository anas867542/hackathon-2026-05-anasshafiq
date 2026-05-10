import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    extraHTTPHeaders: {
      'x-test-run': '1',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Karachi-ish coords for the geolocation prompt
        geolocation: { latitude: 24.8607, longitude: 67.0011 },
        permissions: ['geolocation'],
        contextOptions: {
          viewport: { width: 1280, height: 800 },
        },
      },
    },
  ],
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: WEB_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  metadata: { apiUrl: API_URL },
});
