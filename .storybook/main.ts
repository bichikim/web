import {mergeConfig} from 'vite'
import type {StorybookConfig} from '@kachurun/storybook-solid-vite'

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
    name: '@kachurun/storybook-solid-vite',
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
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // 👇 Default prop filter, which excludes props from node_modules
      propFilter: (prop: any) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),

      shouldExtractLiteralValuesFromEnum: true,
    },
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      define: {
        'process.env': {},
      },
    })
  },
}
