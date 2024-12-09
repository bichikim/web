import nodePath from 'node:path'
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
    '../apps/bplan-client/src/**/*.mdx',
    '../apps/bplan-client/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/solid/src/**/*.mdx',
    '../packages/solid/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
  ],
}
export default config

function getAbsolutePath(value: string): any {
  // eslint-disable-next-line unicorn/prefer-module
  return nodePath.dirname(require.resolve(nodePath.join(value, 'package.json')))
}
