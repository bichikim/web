import {solidStart} from '@solidjs/start/config'
import {createUnoCssInlineResolver} from '@winter-love/unocss-config'
import {nitro} from 'nitro/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig} from 'vite'

import {createDevFeedPlugin} from './src/features/dev-feed/index.ts'

const isAppsInToss = process.env.POMO_BUILD_TARGET === 'apps-in-toss'
const assetLibraryPattern = /[/\\]asset-library[/\\]/u
const staticNitroEntryId = '\0pomo-static-nitro-entry'

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

const useStaticNitroEntry = {
  configEnvironment(name: string, config: {build?: {rolldownOptions?: {input?: string}}}) {
    if (isAppsInToss && name === 'nitro') {
      config.build ??= {}
      config.build.rolldownOptions ??= {}
      // Nitro 3 beta still builds its server environment after static prerendering.
      config.build.rolldownOptions.input = staticNitroEntryId
    }
  },
  load(id: string) {
    if (id === staticNitroEntryId) {
      return 'export default {}'
    }
  },
  name: 'static-nitro-entry',
  resolveId(id: string) {
    if (id === staticNitroEntryId) {
      return id
    }
  },
}

export default defineConfig({
  define: {
    'import.meta.env.POMO_IS_APPS_IN_TOSS': JSON.stringify(isAppsInToss),
  },
  nitro: isAppsInToss
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
  optimizeDeps: {
    include: ['onnxruntime-web/all', 'zod'],
  },
  plugins: [
    createUnoCssInlineResolver(),
    UnoCSS(),
    solidStart({devOverlay: false}),
    createDevFeedPlugin(),
    excludeArchivedAssets,
    nitro(),
    useStaticNitroEntry,
  ],
  resolve: {
    tsconfigPaths: true,
  },
  worker: {format: 'es'},
})
