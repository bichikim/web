import unoCss from '@unocss/vite'
import {fileURLToPath} from 'node:url'
import {mergeConfigs} from 'unocss'
import {defineConfig} from 'vite'

import unoConfig from '../uno.config'

export default defineConfig({
  optimizeDeps: {
    include: [
      '@kobalte/core > @floating-ui/dom',
      '@winter-love/solid-use > @floating-ui/dom',
      '@winter-love/solid-use > es-toolkit/function',
      '@winter-love/utils > es-toolkit/array',
      '@winter-love/utils > es-toolkit/predicate',
      '@winter-love/utils > es-toolkit/string',
      '@winter-love/utils > safe-stable-stringify',
      '@winter-love/utils > scroll-into-view-if-needed',
      '@winter-love/utils > smooth-scroll-into-view-if-needed',
      'axe-core',
    ],
  },
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
