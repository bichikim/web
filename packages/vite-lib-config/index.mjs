import {camelCase} from 'es-toolkit/string'
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
 * @param plugins
 * @param rollupOutputPlugins
 * @return {UserConfig}
 */
export const createConfig = ({
  root = defaultRoot,
  packageJson,
  external = [],
  entry = {},
  alias = {},
  target,
  plugins = [],
  rollupOutputPlugins = [],
} = {}) => {
  const _packageJson =
    packageJson ?? JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

  const {dependencies = {}, name, peerDependencies = {}} = _packageJson ?? {}
  const depsKey = [...Object.keys(dependencies), ...Object.keys(peerDependencies)]
  const externalIds = [...depsKey, ...external]

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
          name: camelCase(name ?? ''),
        },
        rollupOptions: {
          external: (id) =>
            externalIds.some((externalId) => id === externalId || id.startsWith(`${externalId}/`)),
          output: [
            // ESM: 여러 파일로
            {
              entryFileNames: '[name].mjs',
              format: 'es',
              plugins: rollupOutputPlugins,
              preserveModules: true,
              preserveModulesRoot: 'src',
            },
            // CJS: ESM과 동일한 디렉터리 구조로 (서브패스 require 대응)
            {
              entryFileNames: '[name].js',
              exports: 'named',
              format: 'cjs',
              plugins: rollupOutputPlugins,
              preserveModules: true,
              preserveModulesRoot: 'src',
            },
          ],
        },
        target,
      },
      optimizeDeps: {
        exclude: [],
      },
      plugins: [
        solidPlugin(),
        dts({
          afterDiagnostic(diagnostics) {
            // TypeScript DiagnosticCategory.Error 값으로 오류만 빌드 실패에 반영한다.
            if (diagnostics.some((diagnostic) => diagnostic.category === 1)) {
              throw new Error('Declaration generation failed; see TypeScript diagnostics above.')
            }
          },
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
          entryRoot: path.join(root, 'src'),
          exclude: [
            '**/__tests__/**',
            '**/__stories__/**',
            '**/e2e/**',
            '**/*.story.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
            '**/*.test.ts',
            '**/*.test.tsx',
          ],
          include: [path.join(root, 'src/**/*.ts'), path.join(root, 'src/**/*.tsx')],
        }),
        ...plugins,
      ],
      resolve: {
        alias: newAlias,
        tsconfigPaths: true,
      },
    }
  })
}

export const targets =
  'chrome >= 55, safari >= 11.3, firefox >= 53, opera >= 42, edge >= 15, last 2 versions, not dead'
