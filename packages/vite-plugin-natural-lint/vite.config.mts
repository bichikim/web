import {createConfig} from '@winter-love/vite-lib-config'

export default createConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
  },
  external: [
    '@receptron/laya',
    '@opentui/core',
    '@typescript/typescript6',
    'node:child_process',
    'node:crypto',
    'node:fs',
    'node:fs/promises',
    'node:os',
    'node:path',
    'node:readline',
    'node:url',
    'solid-js',
    'tinyglobby',
    'vite',
    'zod',
  ] as string[],
  root: import.meta.dirname,
  solid: {solid: {generate: 'universal', moduleName: '@opentui/solid'}},
})
