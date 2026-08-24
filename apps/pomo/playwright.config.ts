import {defineConfig, devices} from '@playwright/test'

const webBaseUrl = 'http://127.0.0.1:44173'
const appsInTossBaseUrl = 'http://127.0.0.1:44174'

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: './test-results',
  projects: [
    {
      name: 'web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: webBaseUrl,
      },
    },
    {
      name: 'apps-in-toss',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: appsInTossBaseUrl,
      },
    },
  ],
  reporter: process.env.CI ? [['github'], ['html', {open: 'never'}]] : [['list']],
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e',
  timeout: 30_000,
  use: {
    contextOptions: {
      reducedMotion: 'reduce',
    },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm exec vite dev --host 127.0.0.1 --port 44173',
      reuseExistingServer: false,
      timeout: 120_000,
      url: webBaseUrl,
    },
    {
      command:
        'pnpm exec cross-env POMO_PUBLIC_ORIGIN=http://127.0.0.1:44173 POMO_RUNTIME_TARGET=apps-in-toss POMO_APPS_IN_TOSS_DEVTOOLS=true pnpm exec vite dev --host 127.0.0.1 --port 44174',
      reuseExistingServer: false,
      timeout: 120_000,
      url: appsInTossBaseUrl,
    },
  ],
})
