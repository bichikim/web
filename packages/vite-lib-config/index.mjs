import lodash from 'lodash'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'
import solidPlugin from 'vite-plugin-solid'

const defaultRoot = process.cwd()
const defaultIsProduction = process.env.NODE_ENV === 'production'
/**
 * create vite config for building library
 * @param root project root
 * @param packageJson project package json record
 * @param isProduction production build (minify)
 * @return {UserConfig}
 */
export const createConfig = ({
  root = defaultRoot,
  packageJson,
  isProduction = defaultIsProduction,
} = {}) => {
  const _packageJson =
    packageJson ?? JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

  const {dependencies = {}, name} = _packageJson ?? {}
  const depsKey = Object.keys(dependencies)

  return defineConfig(() => {
    return {
      build: {
        lib: {
          entry: {
            index: join(root, 'src/index.ts'),
          },
          formats: ['es', 'cjs'],
          name: lodash.camelCase(name),
        },
        minify: isProduction,
        rollupOptions: {
          external: [...depsKey],
        },
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
        }),
      ],
      resolve: {
        alias: {
          src: join(root, 'src'),
        },
      },
    }
  })
}
