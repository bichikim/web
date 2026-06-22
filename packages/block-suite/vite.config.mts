import {createConfig} from '@winter-love/vite-lib-config'

export default createConfig({
  external: ['@blocksuite/blocks/effects', '@blocksuite/blocks/schemas'],
})
