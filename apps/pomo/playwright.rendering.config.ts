import {defineConfig, devices} from '@playwright/test'
import settings from './playwright.settings.config'

export default defineConfig({
  ...settings,
  projects: [
    {
      name: 'web',
      testMatch: '**/e2e/rendering/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:44173',
        colorScheme: 'dark',
        contextOptions: {reducedMotion: 'reduce'},
        deviceScaleFactor: 1,
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
        viewport: {height: 960, width: 1280},
      },
    },
  ],
  retries: 0,
  timeout: 60_000,
  use: {...settings.use, trace: 'off', video: 'off'},
  webServer: Array.isArray(settings.webServer)
    ? settings.webServer.slice(0, 1)
    : settings.webServer,
  workers: 1,
})
