import assert from 'node:assert/strict'
import {mkdir, readFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {createJiti} from 'jiti'
import {z} from 'zod'

const [recordPath, output, selection = 'original,action'] = process.argv.slice(2)
assert.ok(recordPath && output)
const selected = selection.split(',')
assert.ok(selected.length > 0 && new Set(selected).size === selected.length)
assert.ok(selected.every((id) => ['original', 'action', 'operation'].includes(id)))
const read = async (path) => JSON.parse(await readFile(path, 'utf8'))
const record = await read(recordPath)
const input = await read(resolve(dirname(recordPath), 'input.json'))
const calls = record.trace.filter((entry) =>
  entry.request.prompt.startsWith('Identify up to three missing'),
)
assert.equal(calls.length, 1)
const saved = calls[0].request
const suffix = ` JSON schema: ${JSON.stringify(saved.format)}`
assert.ok(saved.prompt.endsWith(suffix))
const original = saved.prompt.slice(0, -suffix.length)
const instruction =
  'For policy applicability, ask whether the rule governs the compared action, ' +
  'not merely whether the claims share a resource or storage mechanism. '
const marker = 'Pair: '
const operation =
  'For policies, ask whether the stated prohibition governs the concrete operation and trigger ' +
  'in the other claim. Do not replace this with a question about object or storage membership. '
assert.equal(original.split(marker).length, 2)
const variants = {
  action: original.replace(marker, instruction + marker),
  operation: original.replace(marker, operation + marker),
  original,
}
const jiti = createJiti(import.meta.url)
const {generateInspectionJson} = await jiti.import(
  '../../../../src/adapters/experimental/contextual.ts',
)
const {contextQuestionsSchema} = await jiti.import('../../../../src/inspection/context.ts')
const {resolveQuestionModel} = await jiti.import('../../../../src/adapters/questions.ts')
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
const schema = z.object({questions: contextQuestionsSchema}).strict()
assert.deepEqual(z.toJSONSchema(schema), saved.format)
await mkdir(output, {recursive: true})
await Promise.all(
  ['input', ...selected, 'summary'].map((name) =>
    assertArtifactAbsent(resolve(output, `${name}.json`)),
  ),
)
const baseUrl = 'http://127.0.0.1:11434'
assert.deepEqual(await resolveQuestionModel({baseUrl, model: input.model.name}), {
  ok: true,
  value: input.model,
})
await writeArtifact({
  path: resolve(output, 'input.json'),
  value: {instruction, model: input.model, operation, recordPath, selected, variants},
})
const nativeFetch = globalThis.fetch
const results = []
try {
  for (const id of selected) {
    let trace
    globalThis.fetch = async (url, options) => {
      assert.equal(new URL(url).origin, baseUrl)
      assert.equal(new URL(url).pathname, '/api/generate')
      const request = JSON.parse(options.body)
      assert.deepEqual({...request, prompt: saved.prompt}, saved)
      const response = await nativeFetch(url, options)
      trace = {request, response: await response.clone().json()}
      return response
    }
    console.log(JSON.stringify({id, stage: 'start'}))
    const start = Date.now()
    // eslint-disable-next-line no-await-in-loop -- Compare question generation sequentially on the same local model.
    const result = await generateInspectionJson({
      baseUrl,
      format: saved.format,
      model: input.model.name,
      prompt: variants[id],
    })
    const measured = {elapsedMs: Date.now() - start, id, result: schema.parse(result)}
    // eslint-disable-next-line no-await-in-loop -- Retain each response before continuing.
    await writeArtifact({path: resolve(output, `${id}.json`), value: {...measured, trace}})
    results.push(measured)
    console.log(JSON.stringify({...measured, stage: 'done'}))
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
  value: {modelUnchanged: true, questionGenerationOnly: true, results},
})
