import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createJiti} from 'jiti'

const [output] = process.argv.slice(2)
assert.ok(output)
const jiti = createJiti(import.meta.url)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await assertArtifactAbsent(output)
const instruction =
  'For policies, ask whether the stated prohibition governs the concrete operation and trigger ' +
  'in the other claim. Do not replace this with a question about object or storage membership. '
const inputs = [
  '../transfer/runs/07-live/1-mechanism.json',
  '../context/runs/34/cleanup-scope-search.json',
]
const results = []
const REQUEST_TIMEOUT = 120000
for (const path of inputs) {
  // eslint-disable-next-line no-await-in-loop -- Read each fixed pair and initial proposal together.
  const record = JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
  const [, , {request}] = record.trace
  assert.ok(request.prompt.startsWith('Audit whether the source Pair'))
  const body = {...request, prompt: request.prompt.replace('Pair: {', `${instruction}Pair: {`)}
  // eslint-disable-next-line no-await-in-loop -- Compare the two unrelated proposals sequentially.
  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    body: JSON.stringify(body),
    headers: {'content-type': 'application/json'},
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  })
  assert.ok(response.ok)
  // eslint-disable-next-line no-await-in-loop -- Retain the complete model response.
  const envelope = await response.json()
  assert.ok(envelope.done && envelope.model === request.model)
  results.push({path, request: body, response: envelope})
  console.log(JSON.stringify({path, response: envelope.response}))
}
await writeArtifact({path: output, value: {instruction, results}})
