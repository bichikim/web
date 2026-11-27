import {solidStart} from '@solidjs/start/config'
import {nitro} from 'nitro/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig} from 'vite'
import {puppetThreadWorkers} from '@winter-love/puppet/vite/thread-workers'
import buildAssets from './build-assets.json'
import {crossOriginIsolation} from './cross-origin-isolation'

export default defineConfig({
  nitro: {
    prerender: {crawlLinks: true, failOnError: true, routes: ['/']},
    preset: 'static',
  },
  plugins: [
    crossOriginIsolation(),
    UnoCSS({mode: 'dist-chunk'}),
    solidStart({devOverlay: false, ssr: true}),
    nitro(),
    puppetThreadWorkers(),
    {
      // SolidStart supplies the default directory before Vite resolves worker build options.
      config: {handler: () => ({build: {assetsDir: buildAssets.directory}}), order: 'post'},
      name: 'wallpaper-build-assets',
    },
  ],
  server: {host: '127.0.0.1', port: 3410, strictPort: true},
  worker: {format: 'es'},
})
