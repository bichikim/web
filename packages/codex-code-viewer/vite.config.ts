import {defineConfig} from 'vite'
import solid from 'vite-plugin-solid'
import unocss from 'unocss/vite'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  build: {
    assetsInlineLimit: (path) => (path.includes('/pdfjs-dist/') ? true : undefined),
    cssCodeSplit: false,
    emptyOutDir: false,
    target: 'esnext',
  },
  plugins: [
    unocss({configFile: fileURLToPath(new URL('./uno.config.ts', import.meta.url))}),
    solid({hot: false}),
  ],
})
