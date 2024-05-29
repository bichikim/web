import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'

import pkg from './package.json'

const external = [
  //
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]

const resolvePath = (url: string) => fileURLToPath(new URL(url, import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolvePath('src/index.ts'),
      },
      formats: ['es', 'cjs'],
    },
    minify: false,
    rollupOptions: {
      external,
      output: {
        // manualChunks: undefined,
      },
    },
  },
  plugins: [],
  resolve: {
    alias: {
      src: resolvePath('src'),
    },
  },
})
