import {fileURLToPath} from 'node:url'
import unitConfig from '../../vitest.config.mts'

export default {
  ...unitConfig,
  root: fileURLToPath(new URL('./', import.meta.url)),
  test: {
    ...unitConfig.test,
    setupFiles: [fileURLToPath(new URL('../../vitest.setup.ts', import.meta.url))],
  },
}
