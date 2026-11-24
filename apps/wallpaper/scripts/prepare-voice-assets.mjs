import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {appCacheDirectory} from './model-cache.mjs'
import {prepareModelAsset} from '@winter-love/model-cache'

const manifest = JSON.parse(await readFile(new URL('../voice-model.json', import.meta.url), 'utf8'))
const REVISION_LENGTH = 16
const revision = createHash('sha256')
  .update(JSON.stringify(manifest))
  .digest('hex')
  .slice(0, REVISION_LENGTH)
export const voiceDirectory = join(appCacheDirectory(), 'voice-assets', revision)
const require = createRequire(import.meta.url)
const supertonic = dirname(require.resolve('@winter-love/supertonic/runtime'))
export const voiceRuntime = dirname(require.resolve('onnxruntime-web/wasm', {paths: [supertonic]}))
export const voiceAssets = [
  ...manifest.files.map((file) => ({
    dest: `voice-assets/${dirname(file.path)}`,
    src: join(voiceDirectory, file.path),
  })),
  {dest: 'voice-assets', src: fileURLToPath(new URL('../voice-model.json', import.meta.url))},
]

/** Prepares verified speech files in the OS cache for inclusion in development and packaged apps. */
export const prepareVoiceAssets = async () => {
  await Promise.all(manifest.files.map((file) => prepareModelAsset(voiceDirectory, file, file.url)))
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
