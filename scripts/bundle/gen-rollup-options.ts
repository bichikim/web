import resolve, {RollupNodeResolveOptions} from '@rollup/plugin-node-resolve'
import {BundleOptions} from './cre-rollup-bundle'
import path from 'path'
import {OutputOptions} from 'rollup'
import {terser} from 'rollup-plugin-terser'
import {getPackage} from '../utils'
import {defaultsDeep} from 'lodash'
import typescript from 'rollup-plugin-typescript2'
import ttypescript from 'ttypescript'
import tsTreeShaking from 'rollup-plugin-ts-treeshaking'

export interface GenOutputOptions extends OutputOptions {
  minify?: boolean
}

export interface GenRollupOptions {
  cwd?: string
  dist?: string
  src?: string
  entry?: string
  name?: string
  resolve?: RollupNodeResolveOptions
  output?: GenOutputOptions[]
}

export const defDist: string = 'lib'

export const defSrc: string = 'src'

export const defEntry: string = 'index.ts'

export const defExtensions: string[] = ['.mjs', '.js', '.jsx', '.json', '.sass', '.scss', '.ts', '.tsx']

export const defResolverOptions: RollupNodeResolveOptions = {
  extensions: defExtensions,
}

export const genRollupOptions = (options: GenRollupOptions = {}): BundleOptions => {
  const {
    cwd = process.cwd(),
    dist = defDist,
    src = defSrc,
    entry = defEntry,
    output = [],
    resolve: resolveOptions,
  } = options

  const resolvePlugin = resolve(defaultsDeep(defResolverOptions, resolveOptions))
  const typescriptPlugin = typescript({
    typescript: ttypescript,
    tsconfigOverride: {
      compilerOptions: {
        plugins: [
          {transform: '@zerollup/ts-transform-paths'},
        ],
      },
    },
  })
  const typescriptTreeShaking = tsTreeShaking()

  const packageJson = getPackage(cwd)

  const {
    name = packageJson?.name,
  } = options

  const outputPart = {
    name,
  }

  return {
    input: {
      input: path.join(src, entry),
      plugins: [
        resolvePlugin,
        typescriptPlugin,
        typescriptTreeShaking,
      ],
    },
    output: output.map((value) => {
      const {
        minify = false,
        ...rest
      } = value
      return {
        ...outputPart,
        ...rest,
        file: path.resolve(cwd, dist, value.file ?? 'index.js'),
        plugins: minify ? [terser] : [],
      }
    }),
  }
}
