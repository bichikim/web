import {fileURLToPath} from 'node:url'

import {createStorybookConfig} from '../../../.storybook/create-config.ts'

export default createStorybookConfig({
  includeAccessibilityAddon: false,
  stories: [
    '../src/components/p-button/PButton.story.tsx',
    '../src/components/shared-controls/SharedControls.story.tsx',
  ],
  viteConfigPath: fileURLToPath(new URL('../.storybook/vite.config.mts', import.meta.url)),
})
