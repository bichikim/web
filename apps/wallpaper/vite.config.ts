import {defineConfig} from 'vite'
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
  plugins: [UnoCSS(), solid()],
  server: {
    host: '127.0.0.1',
    port: 1430,
    strictPort: true,
    watch: {ignored: ['**/src-tauri/**']},
  },
})
