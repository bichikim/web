import {storybookTest} from '@storybook/addon-vitest/vitest-plugin'
import {playwright} from '@vitest/browser-playwright'
import {fileURLToPath, URL} from 'node:url'
import {defineProject, mergeConfig} from 'vitest/config'
import storybookViteConfig from './.storybook/vite.config.mts'

const storybookConfigDirectory = fileURLToPath(new URL('./.storybook', import.meta.url))
const visualRegressionSetupFiles =
  process.platform === 'darwin' ? ['./.storybook/visual-regression.setup.ts'] : []

export default mergeConfig(
  storybookViteConfig,
  defineProject({
    plugins: [storybookTest({configDir: storybookConfigDirectory})],
    test: {
      browser: {
        enabled: true,
        headless: true,
        instances: [{browser: 'chromium'}],
        provider: playwright({}),
      },
      name: 'storybook',
      // AI_NOTE - Vitest 기준 이미지는 OS별 렌더링 차이를 포함하므로 커밋된 Darwin 기준 이미지와 같은 환경에서만 비교한다.
      setupFiles: visualRegressionSetupFiles,
    },
  }),
)
