/* eslint-disable unicorn/import-style */
import {defineConfig} from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'
import {fileURLToPath} from 'node:url'
import * as nodeFs from 'node:fs'
import * as path from 'node:path'
import {generateSwWithCleanUp} from '@winter-love/sw'
import {targets} from '@winter-love/vite-lib-config'
import legacy from '@vitejs/plugin-legacy'

const {pluginOptions: generateSw, cleanUp: cleanUpGenerateSw} = generateSwWithCleanUp({
  publicPath: 'public',
  root: fileURLToPath(new URL('.', import.meta.url)),
})

export default defineConfig({
  // middleware: 'src/middleware/index.ts',
  server: {
    hooks: {
      close: async () => {
        await cleanUpGenerateSw()
      },
    },
  },
  vite: {
    plugins: [
      //
      UnoCSS(),
      generateSw,
      legacy({
        targets,
      }),
    ],
    resolve: {
      alias: {
        // fix @tonejs/midi is not module js
        // '@tonejs/midi': fileURLToPath(new URL('node_modules/@tonejs/midi/src/Midi.ts', import.meta.url)),

        // root source path alias
        src: fileURLToPath(new URL('src', import.meta.url)),
      },
    },
  },
})
