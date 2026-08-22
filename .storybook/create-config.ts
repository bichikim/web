import {mergeConfig} from 'vite'
import type {StorybookConfig} from 'storybook-solidjs-vite'

interface CreateStorybookConfigOptions {
  readonly stories: StorybookConfig['stories']
  readonly viteConfigPath: string
}

const pretendardStylesheet =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'

export const createStorybookConfig = (options: CreateStorybookConfigOptions): StorybookConfig => ({
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
        viteConfigPath: options.viteConfigPath,
      },
      docgen: false,
    },
  },
  previewHead: (head) => `${head}<link rel="stylesheet" href="${pretendardStylesheet}" />`,
  stories: options.stories,
  async viteFinal(config) {
    return mergeConfig(config, {
      assetsInclude: ['**/*.lottie'],
      define: {
        'process.env': {},
      },
    })
  },
})
