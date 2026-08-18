/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/numeric-separators-style */
import {defineConfig} from '@playwright/test'

const TEN_SECONDS = 120_000

// Retrieve the port from the environment variable
const PORT = process.env.PORT || 22222

// Determine whether to use the e2e server
const USE_E2E_SERVER = PORT === 22222

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e-tests',
  testMatch: /.*\.spec\.ts/u,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: USE_E2E_SERVER
    ? {
        command: 'vite dev --port 22222 --mode e2e',
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        timeout: TEN_SECONDS,
        url: `http://localhost:${PORT}`,
        wait: {
          stdout: /Local:/u,
        },
      }
    : undefined,
})
