import {defineConfig} from 'tsup'
import {solidPlugin} from 'esbuild-plugin-solid'

export default defineConfig({
  clean: true,
  entry: [
    'src/index.tsx',
  ],
  esbuildPlugins: [solidPlugin()],
  format: [
    'cjs',
    'esm',
    'iife',
  ],
  outDir: 'lib',
  sourcemap: true,
  splitting: false,
})
