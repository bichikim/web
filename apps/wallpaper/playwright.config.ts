import {defineConfig} from 'playwright/test'

export default defineConfig({
  expect: {timeout: 10_000},
  outputDir: './test-results',
  reporter: 'list',
  testDir: './browser',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:1495',
    channel: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: {height: 720, width: 560},
  },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 1495 --strictPort',
    cwd: import.meta.dirname,
    reuseExistingServer: false,
    timeout: 60_000,
    url: 'http://127.0.0.1:1495/',
  },
  workers: 1,
})
