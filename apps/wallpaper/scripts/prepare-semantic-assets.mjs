import {createHash} from 'node:crypto'
import {createReadStream, createWriteStream} from 'node:fs'
import {mkdir, readFile, rename, rm, stat, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'

const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = JSON.parse(await readFile(join(root, 'semantic-model.json'), 'utf8'))
export const semanticDirectory = join(root, '.cache/semantic-models/embeddinggemma-2')
const require = createRequire(new URL('../package.json', import.meta.url))
const transformers = require.resolve('@huggingface/transformers')
export const semanticRuntime = dirname(
  require.resolve('onnxruntime-web/wasm', {paths: [dirname(transformers)]}),
)
const digest = async (path) => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}
const valid = async (path, file) => {
  try {
    return (await stat(path)).size === file.size && (await digest(path)) === file.sha256
  } catch (cause) {
    if (cause.code === 'ENOENT') {
      return false
    }
    throw cause
  }
}
const prepare = async (file) => {
  const path = join(semanticDirectory, file.path)
  if (await valid(path, file)) {
    return
  }
  await mkdir(dirname(path), {recursive: true})
  const temporary = `${path}.download`
  try {
    const url = `https://huggingface.co/${manifest.model}/resolve/${manifest.revision}/${file.path}`
    const response = await fetch(url)
    if (!response.ok || response.body === null) {
      throw new Error(`Model asset unavailable: ${file.path} (${response.status})`)
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary))
    if (!(await valid(temporary, file))) {
      throw new Error(`Model asset checksum mismatch: ${file.path}`)
    }
    await rename(temporary, path)
  } finally {
    await rm(temporary, {force: true})
  }
}
export const prepareSemanticAssets = async () => {
  await Promise.all(manifest.files.map(prepare))
  const license = join(semanticDirectory, 'LICENSE.txt')
  try {
    await stat(license)
  } catch (cause) {
    if (cause.code !== 'ENOENT') {
      throw cause
    }
    const response = await fetch('https://www.apache.org/licenses/LICENSE-2.0.txt')
    if (!response.ok) {
      throw new Error('EmbeddingGemma license is unavailable')
    }
    await writeFile(license, await response.text())
  }
  await writeFile(
    join(semanticDirectory, 'NOTICE.txt'),
    `EmbeddingGemma 2 by Google DeepMind. ONNX conversion by onnx-community.\nhttps://huggingface.co/${manifest.model}\nRevision: ${manifest.revision}\nLicensed under Apache License 2.0.\n`,
  )
}
