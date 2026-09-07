import {fileURLToPath} from 'node:url'
import {defineConfig, devices} from '@playwright/test'

const webBaseUrl = 'http://127.0.0.1:44173'
const appsInTossBaseUrl = 'http://127.0.0.1:44174'
const clientActionsBaseUrl = 'http://127.0.0.1:44175'
const clientActionsFixtureDirectory = fileURLToPath(
  new URL('./e2e/fixtures/client-actions/', import.meta.url),
)
const DEFAULT_LOCALE_STORAGE = [{name: 'PARAGLIDE_LOCALE', value: 'ko'}]

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
      testIgnore: 'remote-server-functions.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: webBaseUrl,
      },
    },
    {
      name: 'apps-in-toss',
      testIgnore: 'client-actions.spec.ts',
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
    storageState: {
      cookies: [],
      origins: [webBaseUrl, appsInTossBaseUrl].map((origin) => ({
        localStorage: DEFAULT_LOCALE_STORAGE,
        origin,
      })),
    },
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
    {
      command: 'pnpm exec vite dev --host 127.0.0.1 --port 44175',
      cwd: clientActionsFixtureDirectory,
      reuseExistingServer: false,
      timeout: 120_000,
      url: clientActionsBaseUrl,
    },
  ],
})
