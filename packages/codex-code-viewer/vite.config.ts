import {defineConfig} from 'vite'
import solid from 'vite-plugin-solid'
import unocss from 'unocss/vite'

export default defineConfig({
  build: {
    assetsInlineLimit: (path) => (path.includes('/pdfjs-dist/') ? true : undefined),
    cssCodeSplit: false,
    emptyOutDir: false,
    target: 'esnext',
  },
  plugins: [solid({hot: false}), unocss()],
})
