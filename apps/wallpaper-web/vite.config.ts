import solid from '@solidjs/vite-plugin'
import {prerender} from 'prerender-crawler/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig} from 'vite'
import {puppetThreadWorkers} from '@winter-love/puppet/vite/thread-workers'
import buildAssets from './build-assets.json'
import {crossOriginIsolation} from './cross-origin-isolation'

export default defineConfig({
  plugins: [
    crossOriginIsolation(),
    UnoCSS(),
    solid({ssr: true, start: true}),
    prerender({crawlLinks: false, mode: 'static', pages: ['/']}),
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
