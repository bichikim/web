import solidPlugin from 'vite-plugin-solid'
import {defineConfig} from 'vite'

const BUILD_TARGETS = {
  editor: './src/editor/index.ts',
  'editor-element': './src/editor-element/index.ts',
  player: './src/player/index.ts',
} as const

type BuildTarget = keyof typeof BUILD_TARGETS

const isBuildTarget = (mode: string): mode is BuildTarget => mode in BUILD_TARGETS

export default defineConfig(({command, mode}) => {
  if (command !== 'build') {
    return {plugins: [solidPlugin()]}
  }

  if (!isBuildTarget(mode)) {
    throw new Error(`Unknown Puppet build target: ${mode}`)
  }

  return {
    base: './',
    build: {
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
    plugins: [solidPlugin()],
  }
})
