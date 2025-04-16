import {defineConfig} from '@vite-pwa/assets-generator/config'

/**
 * for pwa-assets-generator command
 * run `pnpm generate-pwa-assets`
 */
export default defineConfig({
  images: ['public/favicon.svg'],
  preset: 'minimal-2023',
})
