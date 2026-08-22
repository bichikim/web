import {fileURLToPath} from 'node:url'

import {solidStart} from '@solidjs/start/config'
import {createUnoCssInlineResolver} from '@winter-love/unocss-config'
import {nitro} from 'nitro/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig, type Plugin} from 'vite'

import {createDevFeedPlugin} from './src/features/dev-feed/index.ts'

const isAppsInToss = process.env.POMO_BUILD_TARGET === 'apps-in-toss'
const appsInTossApiOrigin = new URL(
  process.env.POMO_PUBLIC_ORIGIN?.trim() || 'https://www.pomofi.io',
).origin
const assetLibraryPattern = /[/\\]asset-library[/\\]/u
const buildUnoCssEntryId = '\0pomo-build-uno.css'
const scribbleIconSetPath = fileURLToPath(new URL('./icon-sets/scribble.json', import.meta.url))
const staticNitroEntryId = '\0pomo-static-nitro-entry'

type UnoCssPlugins = ReturnType<typeof UnoCSS>

const scopeUnoCssToClient = (plugins: UnoCssPlugins): UnoCssPlugins =>
  plugins.map((plugin) => ({
    ...plugin,
    applyToEnvironment(environment) {
      if (environment.config.command === 'build' && environment.config.consumer !== 'client') {
        return false
      }

      return plugin.applyToEnvironment?.call(this, environment) ?? true
    },
  }))

const resolveBuildUnoCss = {
  apply: 'build' as const,
  enforce: 'pre' as const,
  load(id: string) {
    if (id === buildUnoCssEntryId) {
      return ''
    }
  },
  name: 'resolve-build-uno-css',
  resolveId(id: string) {
    if (id === 'virtual:uno.css') {
      return buildUnoCssEntryId
    }
  },
}

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

const restartOnScribbleIconChange = {
  configureServer(server) {
    const restartServer = (changedPath: string) => {
      if (changedPath !== scribbleIconSetPath) {
        return
      }

      server.config.logger.info('scribble.json changed, restarting server...')
      server.restart().catch((error: unknown) => {
        const restartError = error instanceof Error ? error : new Error(String(error))
        server.config.logger.error('Failed to reload the scribble icon set.', {
          error: restartError,
        })
      })
    }

    server.watcher.add(scribbleIconSetPath)
    server.watcher.on('change', restartServer)
  },
  name: 'restart-on-scribble-icon-change',
} satisfies Plugin

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
    'import.meta.env.POMO_PUBLIC_ORIGIN': JSON.stringify(appsInTossApiOrigin),
  },
  nitro: isAppsInToss
    ? {
        prerender: {
          routes: [
            '/',
            '/account',
            '/apps-in-toss/privacy',
            '/apps-in-toss/terms',
            '/dev',
            '/dev/character',
            '/dev/chat',
            '/dev/dialogue',
            '/dev/focus-room-layer-review',
            '/dev/speech-to-text',
            '/dev/text-mood',
            '/dev/terms',
            '/dev/voice',
            '/dialogue',
            '/focus-room',
            '/focus-room-dialogue',
            '/privacy',
            '/refund-policy',
            '/terms',
            '/web/privacy',
            '/web/terms',
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
    resolveBuildUnoCss,
    ...scopeUnoCssToClient(UnoCSS({mode: 'dist-chunk'})),
    solidStart({devOverlay: false, middleware: './src/middleware/index.ts'}),
    createDevFeedPlugin(),
    excludeArchivedAssets,
    restartOnScribbleIconChange,
    nitro(),
    useStaticNitroEntry,
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    watch: {
      ignored: [assetLibraryPattern],
    },
  },
  worker: {format: 'es'},
})
