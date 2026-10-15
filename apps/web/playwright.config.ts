import { defineConfig, devices } from '@playwright/test';

// Smoke tests against the production build and the local mock. No real backend, no real auth.
// Locally: `npm run build && npm run e2e` from the repo root.
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm run start -w @web-boilerplate/mock-api',
      cwd: '../..',
      url: 'http://127.0.0.1:4010/categories',
      env: { MOCK_LATENCY_MS: '50' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run start',
      url: 'http://127.0.0.1:3000/items',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
