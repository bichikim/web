import lodash from 'lodash'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'
import solidPlugin from 'vite-plugin-solid'

const defaultRoot = process.cwd()
/**
 * create vite config for building library
 * @param root project root
 * @param packageJson project package json record
 * @param isProduction production build (minify)
 * @param external dependencies not to include in the build
 * @param entry
 * @param alias
 * @param target
 * @return {UserConfig}
 */
export const createConfig = ({
  root = defaultRoot,
  packageJson,
  external = [],
  entry = {},
  alias = {},
  target,
} = {}) => {
  const _packageJson =
    packageJson ?? JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

  const {dependencies = {}, name} = _packageJson ?? {}
  const depsKey = Object.keys(dependencies)
  const newEntry = Object.fromEntries(
    Object.entries(entry).map(([key, value]) => [key, path.join(root, value)]),
  )

  const newAlias = Object.fromEntries(
    Object.entries(alias).map(([key, value]) => [key, path.join(root, value)]),
  )

  return defineConfig(() => {
    return {
      build: {
        lib: {
          entry: {
            index: path.join(root, 'src/index.ts'),
            ...newEntry,
          },
          formats: ['es', 'cjs'],
          name: lodash.camelCase(name),
        },
        rollupOptions: {
          external: [...depsKey, ...external],
        },
        target,
      },
      optimizeDeps: {
        exclude: [],
      },
      plugins: [
        solidPlugin(),
        dts({
          compilerOptions: {
            checkJs: false,
            declaration: true,
            declarationMap: false,
            emitDeclarationOnly: true,
            noEmit: false,
            noEmitOnError: true,
            preserveSymlinks: false,
            skipLibCheck: true,
          },
          entryRoot: './src',
          exclude: ['**/__tests__/*', '**/__stories__/*'],
          include: ['**/*.ts', '**/*.tsx'],
        }),
      ],
      resolve: {
        alias: {
          src: path.join(root, 'src'),
          ...newAlias,
        },
      },
    }
  })
}
