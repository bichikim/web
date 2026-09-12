import assert from 'node:assert/strict'
import {mkdir, readFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {createJiti} from 'jiti'
import {z} from 'zod'

const [recordPath, output] = process.argv.slice(2)
assert.ok(recordPath && output)
const read = async (path) => JSON.parse(await readFile(path, 'utf8'))
const record = await read(recordPath)
const input = await read(resolve(dirname(recordPath), 'input.json'))
const item = input.cases.find((entry) => entry.id === record.id)
assert.ok(item)
assert.equal(input.provider, undefined)
assert.equal(record.result.research.stop, 'no-new-queries')
const saved = record.trace.at(-1).request
assert.ok(saved.prompt.startsWith('For eligible questions return'))
const schemaSuffix = ` JSON schema: ${JSON.stringify(saved.format)}`
assert.ok(saved.prompt.endsWith(schemaSuffix))
const original = saved.prompt.slice(0, -schemaSuffix.length)
const assessment = `Assessment: ${JSON.stringify(record.result.research.reused.decision.proposed)}. `
assert.equal(original.split(assessment).length, 2)
const withoutVerdict = original.replace(
  assessment,
  `Original: ${JSON.stringify({left: item.pair.left.payload.text, right: item.pair.right.payload.text})}. `,
)
const emptyInstruction = 'Return [] if no useful new query remains. '
assert.equal(withoutVerdict.split(emptyInstruction).length, 2)
const variants = [
  {id: 'original', prompt: original},
  {id: 'without-verdict', prompt: withoutVerdict},
  {
    id: 'first-search',
    prompt: withoutVerdict.replace(
      emptyInstruction,
      'For a question with no past attempts, return one query combining its subject with the missing relationship. ' +
        'Return [] only when no unused grounded query remains after prior attempts. ',
    ),
  },
]
const ids = record.result.research.journal.questions.map((question) => question.id)
const MAX_QUESTION = 300
const MAX_QUERIES = 3
const schema = z
  .object({
    queries: z
      .array(
        z
          .object({
            query: z.string().trim().min(1).max(MAX_QUESTION),
            questionId: z.enum(ids),
          })
          .strict(),
      )
      .max(MAX_QUERIES),
  })
  .strict()
assert.deepEqual(z.toJSONSchema(schema), saved.format)
const jiti = createJiti(import.meta.url)
const {generateInspectionJson} = await jiti.import(
  '../../../../src/adapters/experimental/contextual.ts',
)
const {resolveQuestionModel} = await jiti.import('../../../../src/adapters/questions.ts')
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await mkdir(output, {recursive: true})
await Promise.all(
  ['input', 'summary', ...variants.map((variant) => variant.id)].map((id) =>
    assertArtifactAbsent(resolve(output, `${id}.json`)),
  ),
)
const baseUrl = 'http://127.0.0.1:11434'
assert.deepEqual(await resolveQuestionModel({baseUrl, model: input.model.name}), {
  ok: true,
  value: input.model,
})
await writeArtifact({
  path: resolve(output, 'input.json'),
  value: {model: input.model, recordPath, variants},
})
const nativeFetch = globalThis.fetch
let trace
globalThis.fetch = async (url, options) => {
  assert.equal(new URL(url).origin, baseUrl)
  const response = await nativeFetch(url, options)
  if (new URL(url).pathname === '/api/generate') {
    trace = {request: JSON.parse(options.body), response: await response.clone().json()}
  }
  return response
}
const results = []
try {
  for (const variant of variants) {
    console.log(JSON.stringify({id: variant.id, stage: 'start'}))
    const start = Date.now()
    const result = schema.parse(
      // eslint-disable-next-line no-await-in-loop -- Compare isolated requests on one local model sequentially.
      await generateInspectionJson({
        baseUrl,
        format: saved.format,
        model: input.model.name,
        prompt: variant.prompt,
      }),
    )
    assert.deepEqual({...trace.request, prompt: saved.prompt}, saved)
    assert.equal(
      new Set(result.queries.map((query) => query.questionId)).size,
      result.queries.length,
    )
    const measured = {elapsedMs: Date.now() - start, id: variant.id, result, trace}
    // eslint-disable-next-line no-await-in-loop -- Preserve each actual response before proceeding.
    await writeArtifact({path: resolve(output, `${variant.id}.json`), value: measured})
    results.push({...measured, trace: undefined})
    console.log(JSON.stringify({...measured, stage: 'done', trace: undefined}))
  }
} finally {
  globalThis.fetch = nativeFetch
}
assert.deepEqual(await resolveQuestionModel({baseUrl, model: input.model.name}), {
  ok: true,
  value: input.model,
})
await writeArtifact({
  path: resolve(output, 'summary.json'),
  value: {modelUnchanged: true, plannerOnly: true, results},
})
