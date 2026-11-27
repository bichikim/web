import {createReadStream} from 'node:fs'
import {createRequire} from 'node:module'
import {readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {pipeline} from 'node:stream/promises'
import {fileURLToPath} from 'node:url'
import {appCacheDirectory} from './model-cache.mjs'
import {prepareModelAsset} from '@winter-love/model-cache'

const manifest = JSON.parse(await readFile(new URL('../voice-model.json', import.meta.url), 'utf8'))
export const voiceDirectory = join(appCacheDirectory(), 'voice-assets', manifest.revision)
const bundled = manifest.files.filter((file) => !file.path.endsWith('.onnx'))
const weights = new Map(
  manifest.files.filter((file) => file.path.endsWith('.onnx')).map((file) => [file.path, file]),
)
const require = createRequire(import.meta.url)
const supertonic = dirname(require.resolve('@winter-love/supertonic/runtime'))
export const voiceRuntime = dirname(require.resolve('onnxruntime-web/wasm', {paths: [supertonic]}))
export const voiceAssets = [
  ...bundled.map((file) => ({
    dest: `voice-assets/${dirname(file.path)}`,
    src: join(voiceDirectory, file.path),
  })),
  {dest: 'voice-assets', src: fileURLToPath(new URL('../voice-model.json', import.meta.url))},
]

/** Prepares the small speech metadata bundled with the frontend. */
export const prepareVoiceAssets = async () => {
  await Promise.all(bundled.map((file) => prepareModelAsset(voiceDirectory, file, file.url)))
  await writeFile(
    join(voiceDirectory, 'licenses/NOTICE.txt'),
    `${[
      'Supertonic 3 by Supertone Inc.',
      'Model files are subject to the Open RAIL-M license in full.txt, including its use restrictions.',
      'INT8 conversion by k2-fsa/sherpa-onnx. Quantized vector estimator and vocoder;',
      'original duration predictor and text encoder retained. See int8.txt for upstream notices.',
      'Model binaries are unchanged copies of the revisions recorded in voice-model.json.',
    ].join('\n')}\n`,
  )
}

/** Gives browser development the same on-demand cache as the packaged app. */
export const voiceModelAssets = () => ({
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/voice-assets/', (request, response, next) => {
      const path = new URL(request.url, 'http://localhost').pathname.slice(1)
      const file = weights.get(path)
      if (file === undefined || request.method !== 'GET') {
        next()
        return
      }
      const url = `${manifest.downloadOrigin}/models/supertonic-3/${manifest.revision}/${file.path}`
      const serve = async () => {
        const asset = await prepareModelAsset(voiceDirectory, file, url)
        response.setHeader('Cache-Control', 'no-store')
        response.setHeader('Content-Length', file.size)
        response.setHeader('Content-Type', 'application/octet-stream')
        await pipeline(createReadStream(asset), response)
      }
      serve().catch((cause) => {
        if (!response.destroyed) {
          // oxlint-disable-next-line promise/no-callback-in-promise -- Connect owns middleware error responses.
          next(cause)
        }
      })
    })
  },
  name: 'wallpaper-voice-model-assets',
})
