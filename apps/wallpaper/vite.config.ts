import {fileURLToPath} from 'node:url'
import {dirname} from 'node:path'
import {defineConfig, normalizePath} from 'vite'
import {viteStaticCopy} from 'vite-plugin-static-copy'
import catalog from './builtin-assets.json'
import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  clearScreen: false,
  optimizeDeps: {
    include: [
      'dexie',
      '@winter-love/supertonic > onnxruntime-web/wasm',
      '@winter-love/supertonic > onnxruntime-web/webgpu',
    ],
  },
  plugins: [
    UnoCSS(),
    solid(),
    viteStaticCopy({
      targets: [...catalog.puppets, ...catalog.media].map((asset) => ({
        dest: `builtin/${dirname(asset.file)}`,
        src: normalizePath(
          fileURLToPath(new URL(`../wallpaper-web/public/${asset.file}`, import.meta.url)),
        ),
      })),
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 1430,
    strictPort: true,
    watch: {ignored: ['**/src-tauri/**']},
  },
})
