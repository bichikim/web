import {defineConfig} from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'

import {createDevFeedPlugin} from './src/features/dev-feed'

const isAppsInToss = process.env.POMO_BUILD_TARGET === 'apps-in-toss'
const assetLibraryPattern = /[/\\]asset-library[/\\]/u

const excludeArchivedAssets = {
  enforce: 'pre' as const,
  name: 'exclude-archived-assets',
  resolveId(source: string, importer: string | undefined) {
    if (assetLibraryPattern.test(source)) {
      throw new Error(
        `Archived assets cannot be bundled: ${source} (imported by ${importer ?? 'unknown'})`,
      )
    }
  },
}

const app = defineConfig({
  server: isAppsInToss
    ? {
        prerender: {
          routes: [
            '/',
            '/dev',
            '/dev/character',
            '/dev/chat',
            '/dev/dialogue',
            '/dev/focus-room-layer-review',
            '/dev/speech-to-text',
            '/dev/text-mood',
            '/dev/terms',
            '/dev/voice',
            '/focus-room',
            '/focus-room-dialogue',
          ],
        },
        preset: 'static',
      }
    : {},
  ssr: true,
  vite: {
    optimizeDeps: {
      include: ['onnxruntime-web/all', 'zod'],
    },
    plugins: [createDevFeedPlugin(), excludeArchivedAssets, UnoCSS()],
    worker: {format: 'es'},
  },
})

export default app
