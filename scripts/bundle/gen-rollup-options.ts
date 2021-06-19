import resolve, {RollupNodeResolveOptions} from '@rollup/plugin-node-resolve'
import {BundleOptions} from './cre-rollup-bundle'
import path from 'path'
import {OutputOptions} from 'rollup'
import {terser} from 'rollup-plugin-terser'
import del from 'rollup-plugin-delete'
import {getPackage} from '../utils'
import {defaultsDeep} from 'lodash'
import typescript from 'rollup-plugin-typescript2'
// import tsTreeShaking from 'rollup-plugin-ts-treeshaking'
import externals from 'rollup-plugin-node-externals'
import asset from 'rollup-plugin-smart-asset'

export interface GenOutputOptions extends OutputOptions {
  minify?: boolean
}

export type TsTarget = 'ES3' | 'ES5' | 'ES6'
  | 'ES2015' | 'ES2016' | 'ES2017' | 'ES2018'
  | 'ES2019' | 'ES2020' | 'ESNEXT'

export interface GenRollupOptions {
  clean?: boolean
  cwd?: string
  dist?: string
  entry?: string
  name?: string
  output?: GenOutputOptions[]
  resolve?: RollupNodeResolveOptions
  src?: string
  target?: TsTarget
}

export const defDist: string = 'lib'

export const defSrc: string = 'src'

export const defEntry: string = 'index.ts'

export const defFile: string = 'index.js'

export const defExtensions: string[] = ['.mjs', '.js', '.jsx', '.json', '.sass', '.scss', '.ts', '.tsx']

export const defResolverOptions: RollupNodeResolveOptions = {
  extensions: defExtensions,
}

// eslint-disable-next-line max-lines-per-function
export const genRollupOptions = (options: GenRollupOptions = {}): BundleOptions => {
  const {
    clean = false,
    cwd = process.cwd(),
    dist = defDist,
    src = defSrc,
    entry = defEntry,
    target: tsTarget = 'ESNext',
    output = [],
    resolve: resolveOptions,
  } = options

  const resolvePlugin = resolve(defaultsDeep(resolveOptions, defResolverOptions))
  const typescriptPlugin = typescript({
    // typescript: ttypescript,
    cwd,
    tsconfigOverride: {
      compilerOptions: {
        emitDeclarationOnly: false,
        module: 'ESNext',
        paths: {
          '@/*': [
            `${src}/*`,
          ],
        },
        target: tsTarget,
        // plugins: [
        //   {transform: '@zerollup/ts-transform-paths'},
        // ],
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

  // const typescriptTreeShaking = tsTreeShaking()

  const packageJson = getPackage(cwd)

  const inputPlugins = [
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
    // typescriptTreeShaking,
  ]

  if (clean) {
    inputPlugins.push(del({targets: dist}))
  }

  const {
    name = packageJson.name,
  } = options

  const outputPart = {
    name,
  }

  return {
    input: {
      input: path.resolve(cwd, src, entry),
      plugins: inputPlugins,
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
