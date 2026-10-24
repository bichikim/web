import {createConfig} from '@winter-love/vite-lib-config'

export default createConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
    worker: 'src/worker.ts',
  },
  external: [
    '@huggingface/transformers',
    'node:crypto',
    'node:fs',
    'node:path',
    'node:url',
    'node:worker_threads',
    'tinyglobby',
    '@typescript/typescript6',
    'vite',
    'zod',
  ] as string[],
  root: import.meta.dirname,
})
