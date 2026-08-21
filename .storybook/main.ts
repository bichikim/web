import {mergeConfig} from 'vite'
import type {StorybookConfig} from 'storybook-solidjs-vite'

export default <StorybookConfig>{
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-links',
    {
      name: '@storybook/addon-vitest',
      options: {
        cli: false,
      },
    },
  ],
  docs: {
    autodocs: false,
  },
  framework: {
    name: 'storybook-solidjs-vite',
    options: {
      builder: {
        viteConfigPath: './.storybook/vite.config.mts',
      },
      docgen: false,
    },
  },
  stories: [
    '../apps/pomo/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../apps/coong/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/solid-components/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/solid-use/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/player/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/utils/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
  ],
  async viteFinal(config) {
    return mergeConfig(config, {
      assetsInclude: ['**/*.lottie'],
      define: {
        'process.env': {},
      },
    })
  },
}
