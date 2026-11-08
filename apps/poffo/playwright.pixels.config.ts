import {defineConfig} from 'playwright/test'
import character from './playwright.character.config'

export default defineConfig({
  ...character,
  projects: character.projects?.filter((project) => project.name === 'chromium'),
  testDir: './browser/pixels',
  testMatch: '**/capture.e2e.ts',
  webServer: {
    command: 'pnpm --filter @winter-love/poffo exec vite --host 127.0.0.1 --port 4427 --strictPort',
    reuseExistingServer: false,
    url: 'http://127.0.0.1:4427/browser/pixels/index.html',
  },
})
