import { defineConfig } from 'tsup'
import textReplace from 'esbuild-plugin-text-replace'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  format: [
    'cjs',
    'esm',
    'iife'
  ],
  skipNodeModulesBundle: true,
  dts: {
    resolve: false,
  },
  clean: true,
  outDir: 'lib',
  sourcemap: true,
  splitting: false,
})
