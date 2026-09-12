import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdir, readFile} from 'node:fs/promises'
import {join, resolve} from 'node:path'
import {createJiti} from 'jiti'

const [destination] = process.argv.slice(2)
assert.ok(destination)
const output = resolve(destination)
const jiti = createJiti(import.meta.url)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await assertArtifactAbsent(output)
await mkdir(output, {recursive: true})
const read = async (name) => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'))
const baseline = await read('./runs/02/1-desktop-layer.json')
const input = await read('./runs/02/input.json')
const entry = baseline.trace.find(({request}) => request.prompt.startsWith('Write one to three'))
assert.ok(entry)
const insertion = entry.request.prompt.indexOf('Original: ')
assert.ok(insertion > 0)
const instruction =
  'Ask directly for an unknown fact such as the applicable entity, condition, time or rule definition. ' +
  'Do not ask whether the requirements are equivalent, conflicting, compatible, or need clarification. ' +
  'Do not ask to confirm a fact already stated in the pair. ' +
  'Each question must identify a missing fact whose answer could change the comparison. '
const request = {
  ...entry.request,
  prompt:
    entry.request.prompt.slice(0, insertion) + instruction + entry.request.prompt.slice(insertion),
}
const checkModel = async () => {
  const response = await fetch('http://127.0.0.1:11434/api/tags')
  assert.ok(response.ok)
  const data = await response.json()
  assert.equal(
    data.models.find((model) => model.name === input.model.name)?.digest,
    input.model.digest,
  )
}
await checkModel()
const save = (name, value) => writeArtifact({path: join(output, name), value})
await save('input.json', {
  authority: 'question-stage-probe-not-full-pipeline',
  baseline: entry,
  criteria:
    'Ask for the summary input-mode scope, not a comparison verdict; omit stated window-role confirmation.',
  instruction,
  model: input.model,
  request,
  runnerHash: createHash('sha256')
    .update(await readFile(new URL('./probe.mjs', import.meta.url)))
    .digest('hex'),
})
const results = []
const REPEATS = 3
const MAX_QUESTIONS = 3
const MAX_QUESTION = 300
const TIMEOUT = 120000
for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
  // eslint-disable-next-line no-await-in-loop -- Keep local generations isolated.
  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    body: JSON.stringify(request),
    headers: {'content-type': 'application/json'},
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT),
  })
  assert.ok(response.ok)
  // eslint-disable-next-line no-await-in-loop -- Preserve each completed response.
  const envelope = await response.json()
  assert.ok(envelope.done && envelope.model === input.model.name)
  const {questions} = JSON.parse(envelope.response)
  assert.ok(Array.isArray(questions) && questions.length > 0 && questions.length <= MAX_QUESTIONS)
  assert.ok(
    questions.every(
      (question) =>
        typeof question === 'string' &&
        question.trim().length > 0 &&
        question.length <= MAX_QUESTION,
    ),
  )
  results.push({questions, repeat})
  // eslint-disable-next-line no-await-in-loop -- Preserve a partial run before continuing.
  await save(`${repeat}.json`, {repeat, request, response: envelope})
  console.log(JSON.stringify({questions, repeat}))
}
await checkModel()
await save('summary.json', {modelUnchanged: true, results})
