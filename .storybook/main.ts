import {mergeConfig} from 'vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import babelPlugin from 'vite-plugin-babel'
import tsconfigPaths from 'vite-tsconfig-paths'

module.exports = {
  stories: [
    '../packages/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  // babel: async (options) => {
  //   // monorepo alias resolving
  //   // noinspection SpellCheckingInspection
  //   options.plugins.push([
  //     'module-resolver',
  //     {
  //       alias: {
  //         src: './src',
  //       },
  //       cwd: 'packagejson',
  //       loglevel: 'info',
  //     },
  //   ])
  //   return {
  //     ...options,
  //   }
  // },
  features: {
    interactionsDebugger: true,
    'storyStoreV7': true,
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
