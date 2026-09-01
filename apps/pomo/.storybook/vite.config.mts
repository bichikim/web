import unoCss from '@unocss/vite'
import {fileURLToPath} from 'node:url'
import {mergeConfigs} from 'unocss'
import {defineConfig} from 'vite'

import unoConfig from '../uno.config'

export default defineConfig({
  plugins: [
    unoCss(
      mergeConfigs([
        unoConfig,
        {
          configFile: false,
          content: {
            filesystem: [fileURLToPath(new URL('../src/**/*.{ts,tsx}', import.meta.url))],
          },
        },
      ]),
    ),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
