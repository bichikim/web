import {createConfig} from '@winter-love/vite-lib-config'

export default createConfig({
  entry: {
    cli: 'src/cli.ts',
    sw: 'src/sw.ts',
  },
  external: ['node:path', 'node:fs', 'node:url'],
})
