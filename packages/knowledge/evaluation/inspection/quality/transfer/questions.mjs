import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createJiti} from 'jiti'

const [directory, output] = process.argv.slice(2)
assert.ok(directory && output)
const jiti = createJiti(import.meta.url)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await assertArtifactAbsent(output)
const original =
  'For policies, ask whether the stated prohibition governs the concrete operation and trigger ' +
  'in the other claim. Do not replace this with a question about object or storage membership. '
const instruction =
  'Judge missing information by whether the two stated operations can both comply with their requirements. ' +
  'Ask about applicability or triggers, not hypothetical taxonomy or containment ' +
  'between actors, objects or storage mechanisms. '
const REQUEST_TIMEOUT = 120000
const results = []
for (const id of ['revalidation', 'lifetime', 'mechanism']) {
  // eslint-disable-next-line no-await-in-loop -- Keep each source pair paired with its model trace.
  const record = JSON.parse(await readFile(`${directory}/1-${id}.json`, 'utf8'))
  const {request} = record.trace.find((entry) =>
    entry.request.prompt.startsWith('Identify up to three'),
  )
  assert.ok(request.prompt.includes(original))
  const body = {...request, prompt: request.prompt.replace(original, instruction)}
  // eslint-disable-next-line no-await-in-loop -- Exercise one changed question prompt at a time.
  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    body: JSON.stringify(body),
    headers: {'content-type': 'application/json'},
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  })
  assert.ok(response.ok)
  // eslint-disable-next-line no-await-in-loop -- Preserve the complete response before continuing.
  const envelope = await response.json()
  assert.equal(envelope.model, request.model)
  assert.equal(envelope.done, true)
  results.push({id, request: body, response: envelope})
  console.log(JSON.stringify({id, response: envelope.response}))
}
await writeArtifact({path: output, value: {directory, instruction, results}})
