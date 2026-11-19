import {solidStart} from '@solidjs/start/config'
import {nitro} from 'nitro/vite'
import {createUnoCssPlugins} from './build/uno-css'
import {defineConfig} from 'vite'
import {createStaticNitroEntryPlugin} from '../../scripts/vite/static-nitro-entry'

const staticNitroEntryPlugin = createStaticNitroEntryPlugin('\0ai-director-static-entry')

export default defineConfig({
  clearScreen: false,
  nitro: {
    prerender: {failOnError: true, routes: ['/']},
    preset: 'static',
  },
  plugins: [
    ...createUnoCssPlugins(),
    solidStart({devOverlay: false}),
    nitro(),
    staticNitroEntryPlugin,
  ],
  server: {
    host: '127.0.0.1',
    port: 1430,
    strictPort: true,
    watch: {ignored: ['**/src-tauri/**']},
  },
})
