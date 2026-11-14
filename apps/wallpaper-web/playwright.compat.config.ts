import {defineConfig} from 'playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  projects: [
    {name: 'chromium', use: {browserName: 'chromium', channel: 'chromium'}},
    {name: 'webkit', use: {browserName: 'webkit'}},
  ],
  testMatch: [
    '**/album.e2e.ts',
    '**/diagonal.e2e.ts',
    '**/navigation.e2e.ts',
    '**/speech-menu.e2e.ts',
  ],
  use: {...base.use, channel: undefined},
})
