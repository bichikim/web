import {solidStart} from '@solidjs/start/config'
import {createUnoCssInlineResolver} from '@winter-love/unocss-config/src/vite.ts'
import {nitro} from 'nitro/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig, type Plugin} from 'vite'

const BUILD_UNO_ENTRY = '\0fortune-build-uno.css'

const resolveBuildUnoCss = {
  apply: 'build',
  enforce: 'pre',
  load(id) {
    if (id === BUILD_UNO_ENTRY) {
      return ''
    }
  },
  name: 'fortune-build-uno-entry',
  resolveId(id) {
    if (id === 'virtual:uno.css') {
      return BUILD_UNO_ENTRY
    }
  },
} satisfies Plugin

// Vite 8 requires chunk-mode CSS generation; the client manifest carries styles into SSR.
const unoPlugins = UnoCSS({mode: 'dist-chunk'}).map(
  (plugin) =>
    ({
      ...plugin,
      applyToEnvironment(environment) {
        if (environment.config.command === 'build' && environment.config.consumer !== 'client') {
          return false
        }
        return plugin.applyToEnvironment?.call(this, environment) ?? true
      },
    }) satisfies Plugin,
)

export default defineConfig({
  nitro: {
    prerender: {
      failOnError: true,
      routes: ['/', '/about'],
    },
  },
  plugins: [
    createUnoCssInlineResolver(),
    resolveBuildUnoCss,
    ...unoPlugins,
    solidStart({devOverlay: false}),
    nitro(),
  ],
  server: {
    host: '127.0.0.1',
    port: 3410,
    strictPort: true,
  },
})
