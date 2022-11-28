import {mergeConfig} from 'vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import tsconfigPaths from 'vite-tsconfig-paths'

module.exports = {
  stories: [
    '../packages/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../coong/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  features: {
    interactionsDebugger: true,
    storyStoreV7: true,
  },
  'core': {
    'builder': '@storybook/builder-vite',
  },
  async viteFinal(config, {}) {
    return mergeConfig(config, {
      plugins: [
        vueJsx(),
        tsconfigPaths(),
      ],
    })
  },
}
