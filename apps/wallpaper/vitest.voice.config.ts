import {defineConfig} from 'vitest/config'
import browser from './vitest.browser.config'

export default defineConfig({
  ...browser,
  optimizeDeps: {
    include: [
      'dexie',
      'mdast-util-from-markdown',
      '@winter-love/supertonic > onnxruntime-web/wasm',
      '@winter-love/supertonic > onnxruntime-web/webgpu',
    ],
    noDiscovery: true,
  },
  test: {
    ...browser.test,
    include: ['visual/voice.integration.ts'],
    name: 'wallpaper-local-voice',
  },
})
