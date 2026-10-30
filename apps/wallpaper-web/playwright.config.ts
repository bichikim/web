import {defineConfig} from 'playwright/test'

export default defineConfig({
  expect: {timeout: 30_000},
  outputDir: './test-results',
  reporter: 'list',
  testDir: './browser',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4185',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: {height: 900, width: 1280},
  },
  webServer: {
    command:
      'pnpm exec vite preview --config vite.preview.config.ts --host 127.0.0.1 --port 4185 --strictPort',
    reuseExistingServer: false,
    url: 'http://127.0.0.1:4185/',
  },
  workers: 1,
})
