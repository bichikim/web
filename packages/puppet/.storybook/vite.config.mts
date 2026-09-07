import {defineConfig} from 'vite'
import UnoCSS from 'unocss/vite'
import unoConfig from '../uno.config'
import {storyShortcuts} from '../uno/shortcuts/stories'

export default defineConfig({
  plugins: [
    UnoCSS({
      ...unoConfig,
      configFile: false,
      mode: 'shadow-dom',
      safelist: [...(unoConfig.safelist ?? []), ...Object.keys(storyShortcuts)],
      shortcuts: {...unoConfig.shortcuts, ...storyShortcuts},
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
