import {createConfig} from '@winter-love/vite-lib-config'

export default createConfig({
  external: ['node:path', 'node:http', 'node:fs', 'vite'],
})
