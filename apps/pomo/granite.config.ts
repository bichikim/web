import {defineConfig} from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: process.env.POMO_APPS_IN_TOSS_APP_NAME ?? 'pomo-app',
  brand: {
    displayName: '포모파이',
    icon: 'https://static.toss.im/appsintoss/73121/71d4a81e-b8d5-4158-a5df-637bea2111ba.png',
    primaryColor: '#d86845',
  },
  outdir: '.output/public',
  permissions: [],
  web: {
    commands: {
      build: 'pnpm run prepare:apps-in-toss-package',
      dev: 'pnpm run dev',
    },
    host: 'localhost',
    port: 3000,
  },
})
