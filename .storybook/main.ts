import type {StorybookConfig} from 'storybook-solidjs-vite'

const config: StorybookConfig = {
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  docs: {},
  framework: {
    name: 'storybook-solidjs-vite',
    options: {
      builder: {
        viteConfigPath: './.storybook/vite.config.mts',
      },
    },
  },
  stories: [
    '../apps/coong/src/**/*.mdx',
    '../apps/coong/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/solid/src/**/*.mdx',
    '../packages/solid/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/solid-components/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/player/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
  ],
}
export default config
