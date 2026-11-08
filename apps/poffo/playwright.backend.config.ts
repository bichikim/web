import {defineConfig} from 'playwright/test'

export default defineConfig({
  reporter: 'list',
  testDir: './browser/backend',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  use: {
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: {height: 1000, width: 1600},
  },
  workers: 1,
})
