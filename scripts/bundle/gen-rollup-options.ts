import resolve, {RollupNodeResolveOptions} from '@rollup/plugin-node-resolve'
import {BundleOptions} from './cre-rollup-bundle'
import path from 'path'
import {OutputOptions} from 'rollup'
import {terser} from 'rollup-plugin-terser'
import del from 'rollup-plugin-delete'
import {getPackage} from '../utils'
import {defaultsDeep} from 'lodash'
import typescript from 'rollup-plugin-typescript2'
import ttypescript from 'ttypescript'
import tsTreeShaking from 'rollup-plugin-ts-treeshaking'
import externals from 'rollup-plugin-node-externals'
import asset from 'rollup-plugin-smart-asset'

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

export const defFile: string = 'index.js'

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

  const resolvePlugin = resolve(defaultsDeep(resolveOptions, defResolverOptions))
  const typescriptPlugin = typescript({
    typescript: ttypescript,
    cwd,
    tsconfigOverride: {
      compilerOptions: {
        emitDeclarationOnly: false,
        target: 'ESNext',
        module: 'ESNext',
        paths: {
          '@/*': [
            `${src}/*`,
          ],
        },
        plugins: [
          {transform: '@zerollup/ts-transform-paths'},
        ],
      },
      exclude: [
        'node_modules',
        // exclude testing files
        '__tests__/**/*',
        '**/__tests__/**/*',
      ],
    },
  })
  const externalsPlugin = externals({
    deps: true,
  })

  const terserPlugin = terser()

  const assetPlugin = asset()

  const typescriptTreeShaking = tsTreeShaking()

  const packageJson = getPackage(cwd)

  const deletePlugin = del({targets: dist})

  const {
    name = packageJson.name,
  } = options

  const outputPart = {
    name,
  }

  return {
    input: {
      input: path.resolve(cwd, src, entry),
      plugins: [
        assetPlugin,
        /**
         * this externals plugin must be in front of the resolve plugin
         * @see https://www.npmjs.com/package/rollup-plugin-node-externals
         */
        externalsPlugin,
        resolvePlugin,
        typescriptPlugin,
        /**
         * this typescript tree shaking must be after the typescript plugin
         * @see https://www.npmjs.com/package/rollup-plugin-ts-treeshaking
         */
        typescriptTreeShaking,
        deletePlugin,
      ],
    },
    output: output.map((value) => {
      const {
        minify = false,
        ...rest
      } = value

      const plugins: any[] = []

      if (minify) {
        plugins.push(terserPlugin)
      }

      return {
        ...outputPart,
        ...rest,
        file: path.resolve(cwd, dist, value.file ?? defFile),
        plugins,
      }
    }),
  }
}
