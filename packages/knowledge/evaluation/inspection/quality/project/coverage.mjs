import assert from 'node:assert/strict'
import {mkdir, readFile} from 'node:fs/promises'
import {join, resolve} from 'node:path'
import {createJiti} from 'jiti'

const output = resolve(process.argv[2])
const mode = process.argv[3] ?? 'original'
assert.ok(['original', 'direct'].includes(mode))
const jiti = createJiti(import.meta.url)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await assertArtifactAbsent(output)
await mkdir(output, {recursive: true})
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const input = await read('./runs/07-recheck/input.json')
const instruction =
  'Identify the exact unknown the question asks to resolve. If it asks which scope or alternative applies, ' +
  'the answer must identify that scope or alternative and the evidence must establish that choice. ' +
  'Describing the alternatives or repeating one claim is not a resolution. ' +
  'If different answers to that unknown remain compatible with all cited facts, supported=false; ' +
  'name that unknown in missing. Do not turn a request to clarify a fact into a yes/no answer ' +
  'about whether clarification is needed. '
const fixtures = [
  {expected: false, id: 'desktop', path: './runs/07-recheck/1-desktop-layer.json'},
  {expected: true, id: 'retention', path: '../placement/runs/01-supplemental/1-retention.json'},
]
const cases = await Promise.all(
  fixtures.map(async (item) => {
    const record = await read(item.path)
    const entry = record.trace.find(({request}) =>
      request.prompt.startsWith('Audit whether each proposed answer'),
    )
    assert.ok(entry)
    const data = JSON.parse(
      entry.request.prompt.split('Data: ')[1].split('. JSON schema: ')[0].replace(/\.$/u, ''),
    )
    const question =
      item.id === 'desktop'
        ? data.questions.find((entry) => entry.question.includes('아이콘 아래'))
        : data.questions[0]
    assert.ok(question)
    const originalQuestion = question.question
    const directQuestion =
      "규칙 A의 '아이콘 아래'는 규칙 B의 배경 조작을 끈 상태에만 적용됩니까, " +
      '아니면 기본 상태에도 적용됩니까?'
    const prompt = entry.request.prompt.replace('Data: ', `${instruction}Data: `)
    const requestPrompt =
      mode === 'direct' && item.id === 'desktop'
        ? prompt.replace(JSON.stringify(originalQuestion), JSON.stringify(directQuestion))
        : prompt
    if (mode === 'direct' && item.id === 'desktop') {
      assert.notEqual(requestPrompt, prompt)
    }
    return {
      ...item,
      questionId: question.id,
      request: {
        ...entry.request,
        prompt: requestPrompt,
      },
    }
  }),
)
const save = (name, value) => writeArtifact({path: join(output, name), value})
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
await save('input.json', {
  authority: 'audit-only-probe-not-full-pipeline',
  cases,
  instruction,
  mode,
  model: input.model,
})
const results = []
const REPEATS = 3
const TIMEOUT = 120000
for (const item of cases) {
  for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
    // eslint-disable-next-line no-await-in-loop -- Keep local model generations sequential.
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      body: JSON.stringify(item.request),
      headers: {'content-type': 'application/json'},
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT),
    })
    assert.ok(response.ok)
    // eslint-disable-next-line no-await-in-loop -- Preserve each actual response.
    const envelope = await response.json()
    assert.ok(envelope.done && envelope.model === input.model.name)
    const parsed = JSON.parse(envelope.response)
    const {findings} = parsed
    const target = findings.find((finding) => finding.questionId === item.questionId)
    const agrees =
      target?.supported === item.expected &&
      (item.expected
        ? target.missing === '' && target.evidence.length > 0
        : target.missing.trim().length > 0)
    const result = {agrees, id: item.id, repeat, target}
    results.push(result)
    // eslint-disable-next-line no-await-in-loop -- Retain partial progress on failure.
    await save(`${item.id}-${repeat}.json`, {...result, request: item.request, response: envelope})
    console.log(JSON.stringify(result))
  }
}
await checkModel()
await save('summary.json', {modelUnchanged: true, results})
