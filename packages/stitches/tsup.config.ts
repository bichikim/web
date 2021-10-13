
import type {Options} from 'tsup'
export const tsup: Options = {
  clean: true,
  entryPoints: ['src/index.ts'],
  format: ['cjs', 'esm', 'iife'],
  outDir: 'lib',
  sourcemap: true,
  splitting: false,

}
