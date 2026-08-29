import {fileURLToPath} from 'node:url'

import {createStorybookConfig} from '../../../.storybook/create-config'

export default createStorybookConfig({
  stories: ['../src/**/*.story.@(js|jsx|mjs|ts|tsx)'],
  viteConfigPath: fileURLToPath(new URL('./vite.config.mts', import.meta.url)),
})
