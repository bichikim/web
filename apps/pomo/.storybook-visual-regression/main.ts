import {fileURLToPath} from 'node:url'

import {createStorybookConfig} from '../../../.storybook/create-config.ts'

export default createStorybookConfig({
  includeAccessibilityAddon: false,
  stories: ['../src/components/PButton.story.tsx', '../src/components/SharedControls.story.tsx'],
  viteConfigPath: fileURLToPath(new URL('../.storybook/vite.config.mts', import.meta.url)),
})
