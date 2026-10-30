import {defineConfig} from 'playwright/test'

const CI_TIMEOUT = 360_000
const LOCAL_TIMEOUT = 60_000
const CI_PIXEL_RATIO = 0.5

export default defineConfig({
  expect: {timeout: 30_000},
  outputDir: './test-results',
  reporter: 'list',
  testDir: './browser',
  testMatch: '**/*.e2e.ts',
  // CI uses software WebGL; scenario duration includes every action and assertion.
  timeout: process.env.CI ? CI_TIMEOUT : LOCAL_TIMEOUT,
  use: {
    actionTimeout: 30_000,
    baseURL: 'http://127.0.0.1:4185',
    browserName: 'chromium',
    channel: 'chromium',
    // Keep CSS geometry while bounding backing pixels on the software renderer.
    deviceScaleFactor: process.env.CI ? CI_PIXEL_RATIO : 1,
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
