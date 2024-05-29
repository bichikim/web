import {createConfig} from '@winter-love/vite-lib-config'

export default createConfig({
  alias: {
    '@winter-love/solid/test': 'src/test',
    '@winter-love/solid/use': 'src/use',
  },
  entry: {
    'components/index': 'src/components',
    'test/index': 'src/test',
    'use/index': 'src/use',
  },
  external: ['@winter-love/solid/use', '@winter-love/solid/test'],
})
