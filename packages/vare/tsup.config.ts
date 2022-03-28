import {defineConfig} from 'tsup'

export default defineConfig({
  clean: true,
  dts: {
    resolve: false,
  },
  entry: [
    'src/index.ts',
  ],
  format: [
    'cjs',
    'esm',
    'iife',
  ],
  outDir: 'lib',
  skipNodeModulesBundle: true,
  sourcemap: true,
  splitting: false,
})
