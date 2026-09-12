import assert from 'node:assert/strict'
import {mkdir, readFile} from 'node:fs/promises'
import {dirname} from 'node:path'
import {createJiti} from 'jiti'
import {instructions} from './instructions.mjs'

const [recordPath, output, assessment] = process.argv.slice(2)
assert.ok(recordPath && output && Object.hasOwn(instructions, assessment))
const read = async (path) => JSON.parse(await readFile(path, 'utf8'))
const record = await read(recordPath)
const input = await read(`${dirname(recordPath)}/input.json`)
assert.equal(input.provider, undefined)
assert.equal(record.mode, 'search')
const item = input.cases.find((entry) => entry.id === record.id)
assert.ok(item)
const last = record.trace.at(-1)
assert.ok(last.request.prompt.startsWith(input.instruction))
const originalPrompt = last.request.prompt.slice(input.instruction.length)
assert.ok(originalPrompt.startsWith('Reassess the original pair using the retrieved knowledge.'))
const jiti = createJiti(import.meta.url)
const {classifyResearchPair} = await jiti.import(
  '../../../../src/adapters/experimental/research.ts',
)
const {resolveQuestionModel} = await jiti.import('../../../../src/adapters/questions.ts')
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await mkdir(dirname(output), {recursive: true})
await assertArtifactAbsent(output)
const baseUrl = 'http://127.0.0.1:11434'
const searchLimit = 3
const model = await resolveQuestionModel({baseUrl, model: input.model.name})
assert.deepEqual(model, {ok: true, value: input.model})
const nativeFetch = globalThis.fetch
let calls = 0
let searches = 0
let live
globalThis.fetch = async (url, options) => {
  const target = new URL(url)
  assert.equal(target.origin, baseUrl)
  if (target.pathname === '/api/tags') {
    return nativeFetch(url, options)
  }
  assert.equal(target.pathname, '/api/generate')
  const request = JSON.parse(options.body)
  const index = calls
  calls += 1
  assert.ok(index < record.trace.length)
  if (index < record.trace.length - 1) {
    assert.deepEqual(request, record.trace[index].request)
    return Response.json(record.trace[index].response)
  }
  assert.deepEqual(request, {...last.request, prompt: originalPrompt})
  const sent = {...request, prompt: instructions[assessment] + originalPrompt}
  const response = await nativeFetch(url, {...options, body: JSON.stringify(sent)})
  live = {request: sent, response: await response.clone().json()}
  return response
}
const result = await classifyResearchPair({
  baseUrl,
  linked: [],
  model: input.model,
  pair: item.pair,
  points: input.points,
  reader: {
    search: async ({query, limit}) => {
      assert.equal(limit, searchLimit)
      const saved = record.queries[searches]
      searches += 1
      assert.equal(query, saved.query)
      return saved.found
    },
  },
})
const report = {
  assessment,
  calls,
  correct: result.ok && record.expected.includes(result.value.kind),
  expected: record.expected,
  frozenPriorResponses: record.trace.length - 1,
  live,
  model: input.model,
  recordPath,
  result,
  searches,
}
await writeArtifact({path: output, value: report})
console.log(
  JSON.stringify({
    ...report,
    live: undefined,
    result: {error: result.error, ok: result.ok, value: result.value},
  }),
)
assert.equal(calls, record.trace.length)
assert.equal(searches, record.queries.length)
assert.ok(report.correct)
