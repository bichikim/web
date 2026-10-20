import {readFile} from 'node:fs'
import {fileURLToPath} from 'node:url'
import UnoCSS from 'unocss/vite'
import solidPlugin from 'vite-plugin-solid'
import {defineConfig, type Plugin} from 'vite'

import unoConfig from './uno.config'

const BUILD_TARGETS = {
  converter: './src/converter/index.ts',
  editor: './src/editor/index.ts',
  'editor-element': './src/editor-element/index.ts',
  player: './src/player/index.ts',
} as const

type BuildTarget = keyof typeof BUILD_TARGETS

const isBuildTarget = (mode: string): mode is BuildTarget => mode in BUILD_TARGETS

const trackingAssets = (): Plugin => ({
  configureServer(server) {
    const assets = new Map(
      [
        'vision_bundle.js',
        'vision_wasm_internal.js',
        'vision_wasm_internal.wasm',
        'vision_wasm_nosimd_internal.js',
        'vision_wasm_nosimd_internal.wasm',
      ].map((name) => [
        `/tracking/vendor/${name}`,
        fileURLToPath(import.meta.resolve(`@mediapipe/tasks-vision/${name}`)),
      ]),
    )
    server.middlewares.use((request, response, next) => {
      const path = assets.get(request.url ?? '')
      if (path === undefined) {
        next()
        return
      }
      readFile(path, (error, content) => {
        if (error !== null) {
          next(error)
          return
        }
        response.setHeader(
          'Content-Type',
          path.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
        )
        response.end(content)
      })
    })
  },
  name: 'puppet-tracking-assets',
})

export default defineConfig(({command, mode}) => {
  const plugins = [UnoCSS({...unoConfig, configFile: false, mode: 'shadow-dom'}), solidPlugin()]

  if (command !== 'build') {
    return {
      optimizeDeps: {exclude: ['es-toolkit']},
      plugins: [...plugins, trackingAssets()],
    }
  }

  if (!isBuildTarget(mode)) {
    throw new Error(`Unknown Puppet build target: ${mode}`)
  }

  return {
    base: './',
    build: {
      copyPublicDir: false,
      emptyOutDir: mode === 'player',
      lib: {
        entry: new URL(BUILD_TARGETS[mode], import.meta.url).pathname,
        fileName: () => `${mode}.js`,
        formats: ['es'],
      },
      rollupOptions: {
        external: mode === 'editor' ? ['solid-js', 'solid-js/web'] : [],
      },
    },
    plugins,
  }
})
