import {readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {appCacheDirectory} from './model-cache.mjs'
import {prepareModelAsset} from '@winter-love/model-cache'

const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = JSON.parse(await readFile(join(root, 'semantic-model.json'), 'utf8'))
export const semanticDirectory = join(
  appCacheDirectory(),
  'semantic-models',
  manifest.revision,
  'embeddinggemma-2',
)
const legacyDirectory = join(root, '.cache/semantic-models/embeddinggemma-2')
const require = createRequire(new URL('../package.json', import.meta.url))
const transformers = require.resolve('@huggingface/transformers')
export const semanticRuntime = dirname(
  require.resolve('onnxruntime-web/wasm', {paths: [dirname(transformers)]}),
)
export const prepareSemanticAssets = async () => {
  await Promise.all(
    manifest.files.map((file) =>
      prepareModelAsset(
        semanticDirectory,
        file,
        `https://huggingface.co/${manifest.model}/resolve/${manifest.revision}/${file.path}`,
        [legacyDirectory],
      ),
    ),
  )
  await writeFile(
    join(semanticDirectory, 'LICENSE.txt'),
    await readFile(join(root, 'src-tauri/licenses/semantic-model.txt')),
  )
  await writeFile(
    join(semanticDirectory, 'NOTICE.txt'),
    `EmbeddingGemma 2 by Google DeepMind. ONNX conversion by onnx-community.\nhttps://huggingface.co/${manifest.model}\nRevision: ${manifest.revision}\nLicensed under Apache License 2.0.\n`,
  )
}
