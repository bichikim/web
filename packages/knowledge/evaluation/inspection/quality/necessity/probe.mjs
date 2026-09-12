import assert from 'node:assert/strict'
import {mkdir, readFile} from 'node:fs/promises'
import {dirname} from 'node:path'
import {createJiti} from 'jiti'

const [directory, output] = process.argv.slice(2)
assert.ok(directory && output)
const jiti = createJiti(import.meta.url)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await assertArtifactAbsent(output)
await mkdir(dirname(output), {recursive: true})
const instruction =
  'Audit whether the source Pair contains the premises needed for the Initial comparison. ' +
  'Initial is a proposal, not evidence. Ask up to three questions only for missing premises ' +
  'that the comparison depends on, including an unstated rule meaning, priority or trigger. ' +
  'A rule name alone does not supply its meaning; do not use remembered definitions as source evidence. ' +
  'If the explicit requirements already support the comparison, return questions: []. ' +
  'Do not require hypothetical relationships beyond those requirements. ' +
  'Absence of an exception is not proof of conflict. Return questions in the language of Pair. '
const REQUEST_TIMEOUT = 120000
const results = []
for (const id of ['revalidation', 'lifetime', 'mechanism', 'archive']) {
  // eslint-disable-next-line no-await-in-loop -- Preserve each isolated request and response.
  const record = JSON.parse(await readFile(`${directory}/1-${id}.json`, 'utf8'))
  const {request} = record.trace.find((entry) =>
    entry.request.prompt.startsWith('Identify up to three'),
  )
  const offset = request.prompt.indexOf('Pair: {')
  assert.ok(offset > 0)
  const body = {...request, prompt: instruction + request.prompt.slice(offset)}
  // eslint-disable-next-line no-await-in-loop -- Do not overlap local model generations.
  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    body: JSON.stringify(body),
    headers: {'content-type': 'application/json'},
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  })
  assert.ok(response.ok)
  // eslint-disable-next-line no-await-in-loop -- Capture the complete model envelope.
  const envelope = await response.json()
  assert.equal(envelope.model, request.model)
  assert.equal(envelope.done, true)
  results.push({id, request: body, response: envelope})
  console.log(JSON.stringify({id, response: envelope.response}))
}
await writeArtifact({path: output, value: {directory, instruction, results}})
