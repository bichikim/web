import {storybookBackground} from '../../../.storybook/unocss'
import unoCss from '@unocss/vite'
import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vite'
import {mergeConfigs} from 'unocss'

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
          preflights: [storybookBackground],
        },
      ]),
    ),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
