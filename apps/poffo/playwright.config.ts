import {defineConfig} from 'playwright/test'

const outputDirectory =
  process.env.POFFO_VERCEL_OUTPUT === 'true' ? ' --outDir ../../.vercel/output/static' : ''

export default defineConfig({
  reporter: 'list',
  testDir: './browser',
  testMatch: '**/*.e2e.ts',
  use: {
    baseURL: 'http://127.0.0.1:4177',
    browserName: 'chromium',
    headless: true,
    launchOptions: {args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']},
    permissions: ['camera'],
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: {height: 900, width: 1440},
  },
  webServer: [
    {
      command: `pnpm exec vite preview${outputDirectory} --host 127.0.0.1 --port 4177 --strictPort`,
      reuseExistingServer: false,
      url: 'http://127.0.0.1:4177/editor',
    },
    {
      command: 'pnpm --dir ../../packages/puppet dev --host 127.0.0.1 --port 4180 --strictPort',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:4180/element.html',
    },
  ],
  workers: 1,
})
