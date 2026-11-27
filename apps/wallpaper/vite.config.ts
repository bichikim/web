import {
  prepareSemanticAssets,
  semanticDirectory,
  semanticRuntime,
} from './scripts/prepare-semantic-assets.mjs'
import {fileURLToPath} from 'node:url'
import {prepareWhisperRuntime} from './scripts/prepare-whisper-runtime.mjs'
import {dictationAssets} from './scripts/dictation-assets.mjs'
import {conversationAssets} from './scripts/conversation-assets.mjs'
import {prepareTrackingAssets, trackingAssets} from './scripts/prepare-tracking-assets.mjs'
import {
  prepareVoiceAssets,
  voiceAssets,
  voiceDirectory,
  voiceModelAssets,
  voiceRuntime,
} from './scripts/prepare-voice-assets.mjs'
import {dirname} from 'node:path'
import {defineConfig, normalizePath} from 'vite'
import {viteStaticCopy} from 'vite-plugin-static-copy'
import {PUPPET_THREAD_WORKERS} from '@winter-love/puppet/vite/thread-workers'
import catalog from './builtin-assets.json'
import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'

export default defineConfig(async ({command}) => {
  if (command === 'serve') {
    await prepareSemanticAssets()
  }
  await prepareWhisperRuntime()
  await prepareTrackingAssets()
  await prepareVoiceAssets()
  return {
    clearScreen: false,
    optimizeDeps: {
      include: [
        'dexie',
        '@winter-love/supertonic > onnxruntime-web/wasm',
        '@winter-love/supertonic > onnxruntime-web/webgpu',
      ],
    },
    plugins: [
      conversationAssets(),
      voiceModelAssets(),
      UnoCSS(),
      solid(),
      viteStaticCopy({
        targets: [
          // The prebuilt numerical Worker loads its thread entries relative to its own URL.
          {dest: 'assets', src: PUPPET_THREAD_WORKERS},
          ...dictationAssets,
          ...trackingAssets.map((asset) => ({...asset, src: normalizePath(asset.src)})),
          ...voiceAssets.map((asset) => ({...asset, src: normalizePath(asset.src)})),
          {
            dest: 'voice-assets/licenses',
            src: normalizePath(`${voiceDirectory}/licenses/NOTICE.txt`),
          },
          {
            dest: 'voice-runtime',
            src: normalizePath(`${voiceRuntime}/ort-wasm-simd-threaded*.{mjs,wasm}`),
          },
          {dest: 'semantic-runtime', src: normalizePath(`${semanticRuntime}/*.wasm`)},
          {dest: 'semantic-runtime', src: normalizePath(`${semanticRuntime}/*.mjs`)},
          ...(command === 'serve'
            ? [
                {
                  dest: 'semantic-models/embeddinggemma-2',
                  src: normalizePath(`${semanticDirectory}/*`),
                },
              ]
            : []),
          ...[...catalog.puppets, ...catalog.media].map((asset) => ({
            dest: `builtin/${dirname(asset.file)}`,
            src: normalizePath(
              fileURLToPath(new URL(`../wallpaper-web/public/${asset.file}`, import.meta.url)),
            ),
          })),
        ],
      }),
    ],
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      host: '127.0.0.1',
      port: 1430,
      strictPort: true,
      watch: {ignored: ['**/src-tauri/**']},
    },
  }
})
