import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import UnoCSS from 'unocss/vite'
import solidPlugin from 'vite-plugin-solid'
import {defineConfig} from 'vite'

import unoConfig from './uno.config'

const BUILD_TARGETS = {
  converter: './src/converter/index.ts',
  editor: './src/editor/index.ts',
  'editor-element': './src/editor-element/index.ts',
  player: {
    native: './src/native/index.ts',
    player: './src/player/index.ts',
  },
} as const

type BuildTarget = keyof typeof BUILD_TARGETS

const isBuildTarget = (mode: string): mode is BuildTarget => mode in BUILD_TARGETS

const converterBanner = () => {
  const notices = readFileSync(new URL('./licenses/converter.txt', import.meta.url), 'utf8')
  return `/*!\n${notices.replaceAll('*/', '* /')}*/`
}

export default defineConfig(({command, mode}) => {
  const plugins = [UnoCSS({...unoConfig, configFile: false, mode: 'shadow-dom'}), solidPlugin()]

  if (command !== 'build') {
    return {
      optimizeDeps: {exclude: ['es-toolkit']},
      plugins,
      resolve: {
        alias: {
          '/converter.js': fileURLToPath(new URL(BUILD_TARGETS.converter, import.meta.url)),
        },
      },
    }
  }

  if (!isBuildTarget(mode)) {
    throw new Error(`Unknown Puppet build target: ${mode}`)
  }

  const entry = BUILD_TARGETS[mode]
  return {
    base: './',
    build: {
      copyPublicDir: false,
      emptyOutDir: mode === 'player',
      lib: {
        entry:
          typeof entry === 'string'
            ? fileURLToPath(new URL(entry, import.meta.url))
            : Object.fromEntries(
                Object.entries(entry).map(([name, path]) => [
                  name,
                  fileURLToPath(new URL(path, import.meta.url)),
                ]),
              ),
        fileName: (_, name) => `${typeof entry === 'string' ? mode : name}.js`,
        formats: ['es'],
      },
      rollupOptions: {
        external: mode === 'editor' ? ['solid-js', 'solid-js/web'] : [],
        output:
          mode === 'converter'
            ? {
                banner: converterBanner,
              }
            : undefined,
      },
    },
    plugins,
    ...(mode === 'player'
      ? {
          worker: {
            format: 'es',
            rolldownOptions: {output: {chunkFileNames: 'assets/puppet-worker-[name]-[hash].js'}},
          },
        }
      : {}),
  }
})
