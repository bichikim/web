import {storybookTest} from '@storybook/addon-vitest/vitest-plugin'
import {playwright} from '@vitest/browser-playwright'
import type {UserConfig} from 'vite'
import {defineProject, mergeConfig} from 'vitest/config'

interface CreateStorybookTestConfigOptions {
  readonly configDirectory: string
  readonly name: string
  readonly setupFiles?: readonly string[]
  readonly viteConfig: UserConfig
}

export const createStorybookTestConfig = (options: CreateStorybookTestConfigOptions) =>
  mergeConfig(
    options.viteConfig,
    defineProject({
      plugins: [storybookTest({configDir: options.configDirectory})],
      test: {
        browser: {
          enabled: true,
          headless: true,
          instances: [{browser: 'chromium'}],
          provider: playwright({}),
        },
        name: options.name,
        setupFiles: options.setupFiles,
      },
    }),
  )
