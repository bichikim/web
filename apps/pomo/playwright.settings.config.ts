import {defineConfig} from '@playwright/test'
import base from './playwright.config'

const baseURL = 'http://127.0.0.1:44173'

export default defineConfig({
  ...base,
  projects: base.projects?.filter((project) => project.name === 'web'),
  testMatch: 'settings.spec.ts',
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 44173',
    env: {
      CRON_SECRET: 'e2e-not-a-real-cron-secret',
      DATABASE_URL: 'postgresql://e2e:e2e@127.0.0.1:9/e2e',
      KMA_SERVICE_KEY: 'e2e-not-a-real-key',
      NEON_AUTH_BASE_URL: 'http://127.0.0.1:9/auth',
      NEON_AUTH_COOKIE_SECRET: 'e2e-not-a-real-cookie-secret-32-characters',
      OPENAI_API_KEY: 'e2e-not-a-real-key',
      OPENAI_WEBHOOK_SECRET: 'e2e-not-a-real-webhook-secret',
      OPENWEATHER_API_KEY: 'e2e-not-a-real-key',
      POMO_PUBLIC_ORIGIN: baseURL,
      POMO_TOSS_MTLS_CERT:
        '-----BEGIN CERTIFICATE-----\ne2e-placeholder\n-----END CERTIFICATE-----',
      POMO_TOSS_MTLS_KEY: '-----BEGIN PRIVATE KEY-----\ne2e-placeholder\n-----END PRIVATE KEY-----',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
})
