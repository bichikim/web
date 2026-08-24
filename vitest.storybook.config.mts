import {fileURLToPath, URL} from 'node:url'

import {createStorybookTestConfig} from './.storybook/create-test-config.ts'
import storybookViteConfig from './.storybook/vite.config.mts'

const storybookConfigDirectory = fileURLToPath(new URL('./.storybook', import.meta.url))
const visualRegressionSetupFiles =
  process.platform === 'darwin' ? ['./.storybook/visual-regression.setup.ts'] : []

export default createStorybookTestConfig({
  configDirectory: storybookConfigDirectory,
  name: 'storybook',
  // Vitest 기준 이미지는 OS별 렌더링 차이를 포함하므로 커밋된 Darwin 기준 이미지와 같은 환경에서만 비교한다.
  setupFiles: visualRegressionSetupFiles,
  viteConfig: storybookViteConfig,
})
