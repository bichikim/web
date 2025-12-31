import {defineConfig} from '@playwright/test'

const TEN_SECONDS = 10_000

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e-tests',
  testMatch: /.*\.spec\.ts/,
  use: {
    baseURL: 'http://localhost:22222',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm run dev:e2e',
    reuseExistingServer: !process.env.CI,
    timeout: TEN_SECONDS,
    url: 'http://localhost:22222',
  },
})
