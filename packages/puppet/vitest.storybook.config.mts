import {fileURLToPath, URL} from 'node:url'

import {createStorybookTestConfig} from '../../.storybook/create-test-config.ts'
import storybookViteConfig from './.storybook/vite.config.mts'

export default createStorybookTestConfig({
  configDirectory: fileURLToPath(new URL('./.storybook', import.meta.url)),
  name: 'storybook-puppet',
  viteConfig: storybookViteConfig,
})
