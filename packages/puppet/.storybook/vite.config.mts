import {defineConfig} from 'vite'
import UnoCSS from 'unocss/vite'
import unoConfig from '../uno.config'
import {storyShortcuts} from '../uno/shortcuts/stories'
import {spacingTheme} from '../uno/spacing'

export default defineConfig({
  plugins: [
    UnoCSS({
      ...unoConfig,
      configFile: false,
      mode: 'shadow-dom',
      safelist: [
        ...(unoConfig.safelist ?? []),
        ...Object.keys(storyShortcuts),
        ...Object.keys(spacingTheme.spacing).map((token) => `gap-${token}`),
      ],
      shortcuts: {...unoConfig.shortcuts, ...storyShortcuts},
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
