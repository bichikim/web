import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createJiti} from 'jiti'

const [recordPath, output] = process.argv.slice(2)
assert.ok(recordPath && output)
const record = JSON.parse(await readFile(recordPath, 'utf8'))
const {request} = record.trace.find((entry) =>
  entry.request.prompt.startsWith('For eligible questions'),
)
const jiti = createJiti(import.meta.url)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await assertArtifactAbsent(output)
const original =
  "Use keywords in the question's language and preserve exact names from the sources. "
assert.ok(request.prompt.includes(original))
const instructions = [
  'Keep the surrounding prose language of each question, not the language of its code identifiers. ' +
    'Use concise keywords and exact names; do not translate the question into English. ',
  'Copy the named directive verbatim and use surrounding question words as short search keywords. ' +
    'Do not translate source words or add remembered definitions. ',
]
const results = []
const REQUEST_TIMEOUT = 120000
for (const instruction of instructions) {
  const body = {...request, prompt: request.prompt.replace(original, instruction)}
  // eslint-disable-next-line no-await-in-loop -- Compare isolated generation variants on one local model.
  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    body: JSON.stringify(body),
    headers: {'content-type': 'application/json'},
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  })
  assert.ok(response.ok)
  // eslint-disable-next-line no-await-in-loop -- Keep the raw model response with its exact request.
  const envelope = await response.json()
  results.push({instruction, request: body, response: envelope})
  console.log(JSON.stringify({instruction, response: envelope.response}))
}
await writeArtifact({path: output, value: {recordPath, results}})
