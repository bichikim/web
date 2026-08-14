import {storybookTest} from '@storybook/addon-vitest/vitest-plugin'
import {playwright} from '@vitest/browser-playwright'
import {fileURLToPath, URL} from 'node:url'
import {defineConfig, mergeConfig} from 'vitest/config'
import storybookViteConfig from './.storybook/vite.config.mts'

const storybookConfigDirectory = fileURLToPath(new URL('./.storybook', import.meta.url))

export default mergeConfig(
  storybookViteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          plugins: [storybookTest({configDir: storybookConfigDirectory})],
          test: {
            browser: {
              enabled: true,
              headless: true,
              instances: [{browser: 'chromium'}],
              provider: playwright({}),
            },
            name: 'storybook',
          },
        },
      ],
    },
  }),
)
