/// <reference types="histoire" />
import {fileURLToPath, URL} from 'node:url'
import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
export default defineConfig({
  // Example build config for a component library
  build: {
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue',
        },
      },
    },
  },

  histoire: {
    // Alternative way of specifying histoire config
    setupFile: '/histoire.setup.ts',
  },

  plugins: [
    // Vite Plugins
    vue(),
    monorepoAlias({
      osPathDelimiter: process.platform === 'win32' ? '\\' : '/',
      root: fileURLToPath(new URL('./', import.meta.url)),
      sourceRoot: 'src',
      workspacePaths: [/^\/coong\//u, /^\/packages\//u],
    }) as any,
  ],
})

console.info('vite histoire debug', fileURLToPath(new URL('./', import.meta.url)))
console.info('vite histoire debug', path.delimiter)
