import {fileURLToPath, URL} from 'node:url'

import {createStorybookTestConfig} from './.storybook/create-test-config.ts'
import storybookViteConfig from './.storybook/vite.config.mts'

const storybookConfigDirectory = fileURLToPath(new URL('./.storybook', import.meta.url))

export default createStorybookTestConfig({
  configDirectory: storybookConfigDirectory,
  name: 'storybook',
  viteConfig: storybookViteConfig,
})
