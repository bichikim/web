import {fileURLToPath} from 'node:url'

import {createStorybookTestConfig} from '../../.storybook/create-test-config.ts'
import storybookViteConfig from './.storybook/vite.config.mts'

export default createStorybookTestConfig({
  configDirectory: fileURLToPath(new URL('./.storybook-visual-regression', import.meta.url)),
  name: 'storybook-pomo-visual-regression',
  setupFiles: [
    fileURLToPath(new URL('../../.storybook/visual-regression.setup.ts', import.meta.url)),
  ],
  viteConfig: storybookViteConfig,
})
