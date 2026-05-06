import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createConfig} from '@winter-love/vite-lib-config/index.mjs'
import {defineConfig} from 'vite'

const utilsRoot = path.dirname(fileURLToPath(import.meta.url))

/** Entry chunks used only as barrel re-exports from the root index — Rollup must emit them for subpath exports. */
const subpathBarrels = [
  'match-run',
  'number-to',
  'pascal-case',
  'path',
  'prev-args',
  'promise',
  'request-Idle-callback',
  'reverse',
  'scroll-into-view',
  'types',
] as const

const subpathEntries = Object.fromEntries(
  subpathBarrels.map((name) => [
    // Use "name/index" so output is dist/<name>/index.mjs (avoids clashing with dist/<name>/ chunks).
    `${name}/index`,
    path.join(utilsRoot, `src/${name}/index.ts`),
  ]),
)

export default defineConfig((env) => {
  const base = createConfig()(env)
  const {rollupOptions} = base.build

  return {
    ...base,
    build: {
      ...base.build,
      lib: {
        ...base.build.lib,
        entry: {
          ...base.build.lib.entry,
          ...subpathEntries,
        },
      },
      rollupOptions: {
        ...rollupOptions,
        output: [
          {
            entryFileNames: '[name].mjs',
            format: 'es',
            preserveModules: true,
            preserveModulesRoot: 'src',
          },
          {
            entryFileNames(chunkInfo) {
              const name = chunkInfo.name
              if (name === 'index') {
                return 'index.cjs'
              }
              if (name.endsWith('/index')) {
                return `${name.slice(0, -'/index'.length)}/index.cjs`
              }
              return `${name}/index.cjs`
            },
            exports: 'named',
            format: 'cjs',
            preserveModules: true,
            preserveModulesRoot: 'src',
          },
        ],
      },
    },
  }
})
