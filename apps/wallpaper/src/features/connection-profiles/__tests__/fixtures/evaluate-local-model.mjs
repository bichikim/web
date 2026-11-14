// oxlint-disable eslint-js/camelcase -- Transformers.js model options use upstream snake case names.
import {readFile, writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {classifySemantics} from '../../../semantics/classify.ts'

// Run with Node 24 from the repository: node <this file> <fp32|q4> <output JSON>.
const [dtype, output] = process.argv.slice(2)
if (!['fp32', 'q4'].includes(dtype) || output === undefined) {
  throw new Error('Provide fp32 or q4 and an output JSON path')
}
const require = createRequire(import.meta.url)
const {AutoConfig, AutoModel, AutoTokenizer, env} = await import(
  pathToFileURL(require.resolve('@huggingface/transformers')).href
)
env.allowRemoteModels = false
env.allowLocalModels = true
env.useBrowserCache = false
const modelPath = new URL('../../../../../.cache/semantic-models/embeddinggemma-2', import.meta.url)
  .pathname
const config = await AutoConfig.from_pretrained(modelPath, {local_files_only: true})
Object.assign(config, {audio_config: null, vision_config: null})
const tokenizer = await AutoTokenizer.from_pretrained(modelPath, {local_files_only: true})
const model = await AutoModel.from_pretrained(modelPath, {
  config,
  device: 'cpu',
  dtype,
  local_files_only: true,
})
const profile = JSON.parse(await readFile(new URL('../../ash.json', import.meta.url), 'utf8'))
const measured = JSON.parse(
  await readFile(new URL('../matching-cases.json', import.meta.url), 'utf8'),
)
const cache = new Map()
const embed = async (texts) => {
  for (const text of texts) {
    if (!cache.has(text)) {
      // oxlint-disable-next-line no-await-in-loop -- Match the application's single-sentence inference without padding unrelated examples.
      const result = await model(
        tokenizer([text], {max_length: 512, padding: true, truncation: true}),
      )
      cache.set(text, result.sentence_embedding.tolist()[0])
    }
  }
  return texts.map((text) => cache.get(text))
}
try {
  const results = []
  for (const sample of measured.cases) {
    // oxlint-disable-next-line no-await-in-loop -- Share one local session and its description cache across the corpus.
    const scores = await classifySemantics({
      bindings: profile.connections.semanticBindings,
      embed,
      text: sample.text,
    })
    results.push({expected: sample.expected, purpose: sample.purpose, scores, text: sample.text})
  }
  await writeFile(output, JSON.stringify({dtype, results}, null, 2))
  console.log(`${dtype}: evaluated ${results.length} local examples`)
} finally {
  await model.dispose()
}
