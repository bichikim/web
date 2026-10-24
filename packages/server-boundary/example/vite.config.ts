import {solidStart} from '@solidjs/start/config'
import {createServerBoundaryPlugin} from '@winter-love/server-boundary'
import {nitro} from 'nitro/vite'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [
    createServerBoundaryPlugin({directories: ['src/server']}),
    solidStart({devOverlay: false}),
    nitro({preset: 'node-server'}),
  ],
})
