import {fileURLToPath} from 'node:url'

import {createStorybookConfig} from './create-config.ts'

export default createStorybookConfig({
  stories: [
    '../packages/solid-components/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/solid-use/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/player/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
    '../packages/utils/src/**/*.story.@(js|jsx|mjs|ts|tsx)',
  ],
  viteConfigPath: fileURLToPath(new URL('./vite.config.mts', import.meta.url)),
})
