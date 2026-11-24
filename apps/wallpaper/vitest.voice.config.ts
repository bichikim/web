import {defineConfig} from 'vitest/config'
import browser from './vitest.browser.config'
import {normalizePath} from 'vite'
import {viteStaticCopy} from 'vite-plugin-static-copy'
import {prepareVoiceAssets, voiceAssets, voiceRuntime} from './scripts/prepare-voice-assets.mjs'
import {playwright} from '@vitest/browser-playwright'

export default defineConfig(async () => {
  await prepareVoiceAssets()
  return {
    ...browser,
    optimizeDeps: {
      ...browser.optimizeDeps,
      include: [
        'dexie',
        'mdast-util-from-markdown',
        '@winter-love/puppet > pixi.js',
        '@winter-love/supertonic > onnxruntime-web/wasm',
        '@winter-love/supertonic > onnxruntime-web/webgpu',
      ],
    },
    plugins: [
      ...browser.plugins,
      viteStaticCopy({
        targets: [
          ...voiceAssets.map((asset) => ({...asset, src: normalizePath(asset.src)})),
          {
            dest: 'voice-runtime',
            src: normalizePath(`${voiceRuntime}/ort-wasm-simd-threaded*.{mjs,wasm}`),
          },
        ],
      }),
    ],
    test: {
      ...browser.test,
      browser: {
        ...browser.test.browser,
        commands: {
          blockExternalRequests: async ({context}) => {
            await context.route(
              (url) => url.hostname !== 'localhost' && url.hostname !== '127.0.0.1',
              (route) => route.abort(),
            )
          },
        },
        instances: [{browser: 'chromium'}, {browser: 'webkit'}],
        provider: playwright(),
      },
      include: ['visual/voice.integration.ts'],
      name: 'wallpaper-local-voice',
    },
  }
})
