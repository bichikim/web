import assert from 'node:assert/strict'
import {mkdir, readFile} from 'node:fs/promises'
import {dirname} from 'node:path'
import {createJiti} from 'jiti'

const [output] = process.argv.slice(2)
assert.ok(output)
const jiti = createJiti(import.meta.url)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await assertArtifactAbsent(output)
await mkdir(dirname(output), {recursive: true})
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const baseline = await read('../transfer/runs/03/1-revalidation.json')
const candidate = await read('./runs/01.json')
const input = await read('../transfer/runs/03/input.json')
const original = baseline.trace.find((entry) => entry.request.prompt.startsWith('Identify')).request
const proposal = candidate.results.find((entry) => entry.id === 'revalidation').request
const {pair} = input.cases.find((entry) => entry.id === 'revalidation')
const source = {left: pair.left.payload.text, right: pair.right.payload.text}
const initial = {
  confidence: 1,
  kind: 'conflict',
  leftQuote: source.left,
  reason: 'The no-cache directive requires origin validation before reuse, so B violates A.',
  rightQuote: source.right,
}
const cases = [
  {id: 'unstated-definition', initial, pair: source, questionsNeeded: true},
  {
    id: 'explicit-definition',
    initial,
    pair: {
      ...source,
      left: `${source.left}\n\n여기서 응답 지시 준수란 재사용 전에 원본 서버의 검증을 받는 것을 뜻한다.`,
    },
    questionsNeeded: false,
  },
]
const resolveModel = async () => {
  const response = await fetch('http://127.0.0.1:11434/api/tags')
  assert.ok(response.ok)
  const data = await response.json()
  const found = data.models.find((model) => model.name === input.model.name)
  assert.equal(found?.digest, input.model.digest)
  return input.model
}
const model = await resolveModel()
const results = []
const REPEATS = 3
const REQUEST_TIMEOUT = 120000
for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
  for (const item of cases) {
    for (const [version, template] of [
      ['21', original],
      ['25', proposal],
    ]) {
      const prefix = template.prompt.slice(0, template.prompt.indexOf('Pair: {'))
      const assessment = {...item.initial, leftQuote: item.pair.left, rightQuote: item.pair.right}
      const request = {
        ...template,
        prompt:
          `${prefix}Pair: ${JSON.stringify(item.pair)}. Initial: ${JSON.stringify(assessment)}. ` +
          `JSON schema: ${JSON.stringify(template.format)}`,
      }
      // eslint-disable-next-line no-await-in-loop -- Compare isolated generations without GPU contention.
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        body: JSON.stringify(request),
        headers: {'content-type': 'application/json'},
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      })
      assert.ok(response.ok)
      // eslint-disable-next-line no-await-in-loop -- Record each complete response before continuing.
      const envelope = await response.json()
      assert.ok(envelope.done && envelope.model === model.name)
      const value = JSON.parse(envelope.response)
      assert.ok(Array.isArray(value.questions))
      const agrees = value.questions.length > 0 === item.questionsNeeded
      results.push({agrees, id: item.id, repeat, request, response: envelope, version})
      console.log(JSON.stringify({agrees, id: item.id, repeat, value, version}))
    }
  }
}
await resolveModel()
await writeArtifact({
  path: output,
  value: {authority: 'synthetic-question-stage-controls-not-user-approved', cases, model, results},
})
