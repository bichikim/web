import {defineConfig} from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: process.env.POMO_APPS_IN_TOSS_APP_NAME ?? 'pomo-app',
  brand: {
    primaryColor: '#d86845',
  },
  permissions: [],
  webBundleDir: '.output/public',
})
