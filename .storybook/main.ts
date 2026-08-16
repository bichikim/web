import {mergeConfig} from 'vite'
import type {StorybookConfig} from 'storybook-solidjs-vite'

export default <StorybookConfig>{
  // AI_NOTE - Story별 네트워크 상태를 재현할 수 있도록 MSW 도입을 검토 중이다.
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
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // 👇 Default prop filter, which excludes props from node_modules
      propFilter: (prop: any) => (prop.parent ? !/node_modules/u.test(prop.parent.fileName) : true),

      shouldExtractLiteralValuesFromEnum: true,
    },
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      assetsInclude: ['**/*.lottie'],
      define: {
        'process.env': {},
      },
    })
  },
}
