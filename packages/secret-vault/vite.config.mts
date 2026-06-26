import {createConfig} from '@winter-love/vite-lib-config'

export default createConfig({
  entry: {
    cli: 'src/cli.ts',
  },
  external: [
    'node:crypto',
    'node:fs',
    'node:os',
    'node:path',
    'node:process',
    'node:readline',
    'node:stream',
    'node:util',
  ],
})
