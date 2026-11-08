import {defineConfig} from 'playwright/test'

export default defineConfig({
  expect: {timeout: 45_000},
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        },
      },
    },
    {name: 'webkit', use: {browserName: 'webkit'}},
  ],
  reporter: 'list',
  testDir: './browser/backend',
  testMatch: '**/character.e2e.ts',
  timeout: 150_000,
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'on',
    viewport: {height: 1000, width: 1600},
  },
  workers: 1,
})
