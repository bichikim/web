import {playwright} from '@vitest/browser-playwright'
import {normalizePath} from 'vite'
import {viteStaticCopy} from 'vite-plugin-static-copy'
import {defineConfig} from 'vitest/config'
import {semanticRuntime} from './scripts/prepare-semantic-assets.mjs'
import browser from './vitest.browser.config'
import {conversationAssets} from './scripts/conversation-assets.mjs'

export default defineConfig({
  ...browser,
  optimizeDeps: {include: ['@huggingface/transformers', '@tauri-apps/api/webviewWindow']},
  plugins: [
    conversationAssets(),
    ...browser.plugins,
    viteStaticCopy({
      targets: [
        {dest: 'semantic-runtime', src: normalizePath(`${semanticRuntime}/*.wasm`)},
        {dest: 'semantic-runtime', src: normalizePath(`${semanticRuntime}/*.mjs`)},
      ],
    }),
  ],
  test: {
    ...browser.test,
    browser: {
      ...browser.test.browser,
      headless: false,
      instances: [{browser: 'chromium'}],
      provider: playwright({
        launchOptions: {channel: 'chrome'},
      }),
    },
    include: ['visual/inference.integration.ts'],
    name: 'wallpaper-local-inference',
  },
})
