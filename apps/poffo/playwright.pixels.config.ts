import {defineConfig} from 'playwright/test'
import character from './playwright.character.config'

export default defineConfig({
  ...character,
  projects: character.projects?.filter((project) => project.name === 'chromium'),
  testDir: './browser/pixels',
  testMatch: '**/capture.e2e.ts',
})
