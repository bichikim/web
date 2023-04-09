/// <reference types="histoire" />
import {fileURLToPath, URL} from 'node:url'
import {viteAlias} from './scripts/vite-alias'
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
  ],

  resolve: {
    alias: [
      viteAlias({
        alias: 'src',
        osPathDelimiter: path.delimiter,
        root: fileURLToPath(new URL('./', import.meta.url)),
        workspacePaths: [
          /^\/apps\/[-/._a-zA-Z0-9]+\/src\//u,
          /^\/packages\/[-/._a-zA-Z0-9]+\/src\//u,
        ],
      }),
    ],
  },
})

console.info('vite histoire debug', fileURLToPath(new URL('./', import.meta.url)))
console.info('vite histoire debug', path.delimiter)
