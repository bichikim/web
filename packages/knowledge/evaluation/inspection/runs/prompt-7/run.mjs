/* oxlint-disable eslint/no-await-in-loop -- Keep local model requests sequential for comparable runs. */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {createJiti} from 'jiti'

const jiti = createJiti(import.meta.url)
const {classifySeparatedPair} = await jiti.import(
  '../../../../src/adapters/experimental/separated.ts',
)
const {createQdrantKnowledgeIndex} = await jiti.import('../../../../src/adapters/qdrant.ts')
const {resolveQuestionModel} = await jiti.import('../../../../src/adapters/questions.ts')
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
const {createKnowledgeContentHash} = await jiti.import('../../../../src/domain/content-hash.ts')
const root = new URL('../../', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const digest = (value) => createHash('sha256').update(value).digest('hex')
const same = (left, right) =>
  left.docId === right.docId &&
  left.unitId === right.unitId &&
  left.contentHash === right.contentHash
const index = createQdrantKnowledgeIndex({
  baseUrl: 'http://localhost:6333',
  collection: 'knowledge-v1',
})
const baseUrl = 'http://localhost:11434'
const model = await resolveQuestionModel({baseUrl, model: 'gemma4:latest'})
assert.equal(model.ok, true)
const definitions = [
  {
    baseline: 'expanded/runs/prompt-3/01/report.json',
    diagnostic: 'expanded/runs/prompt-6/diagnostic.json',
    name: 'expanded',
    prefix: 'expanded/',
  },
  {
    baseline: 'runs/prompt-3/report.json',
    diagnostic: 'runs/prompt-6/diagnostic.json',
    name: 'original',
    prefix: '',
  },
  {
    baseline: 'workplace/baseline.json',
    diagnostic: 'workplace/runs/prompt-6/01/diagnostic.json',
    name: 'workplace',
    prefix: 'workplace/',
  },
]
const run = process.argv[2] ?? '01'
assert.match(run, /^\d{2}$/u)
const startedAt = new Date().toISOString()
for (const name of ['expanded', 'original', 'workplace', 'summary']) {
  await assertArtifactAbsent(fileURLToPath(new URL(`${run}-${name}.json`, import.meta.url)))
}
const source = await readFile(
  new URL('../../../../src/adapters/experimental/separated.ts', import.meta.url),
  'utf8',
)
const results = []
for (const definition of definitions) {
  const previous = await read(definition.diagnostic)
  const golden = await read(`${definition.prefix}golden.json`)
  const baseline = await read(definition.baseline)
  assert.deepEqual(previous.semantic.model, model.value)
  const state = await index.readState({repoId: golden.repoId, workspaceId: golden.workspaceId})
  assert.equal(state.ok, true)
  assert.equal(state.value.length, previous.semantic.sourceUnits.length)
  for (const {payload} of state.value) {
    assert.equal(createKnowledgeContentHash(payload), payload.contentHash)
  }
  const find = (reference) => {
    const point = state.value.find(
      ({payload}) =>
        payload.docId === reference.docId &&
        payload.unitId === reference.unitId &&
        payload.contentHash === reference.contentHash &&
        payload.status === 'active',
    )
    assert.ok(point, `Source mismatch: ${reference.docId}`)
    return point
  }
  for (const reference of previous.semantic.sourceUnits) {
    find(reference)
  }
  const assessments = []
  for (const entry of previous.semantic.assessments) {
    const pair = {left: find(entry.left), right: find(entry.right)}
    const result = await classifySeparatedPair({baseUrl, model: model.value, pair})
    assessments.push({left: entry.left, result, right: entry.right})
    console.log(
      definition.name,
      assessments.length,
      '/',
      previous.semantic.assessments.length,
      result.ok ? result.value.kind : result.error.code,
    )
  }
  const cases = golden.cases.map((entry) => {
    const found = assessments.find(
      (item) =>
        (same(item.left, entry.left) && same(item.right, entry.right)) ||
        (same(item.right, entry.left) && same(item.left, entry.right)),
    )
    assert.ok(found)
    const predicted = found.result.ok ? found.result.value.kind : null
    return {
      correct: predicted === entry.expected,
      expected: entry.expected,
      id: entry.id,
      predicted,
    }
  })
  const regressions = cases.filter(
    (entry) =>
      !entry.correct && baseline.cases.find((item) => item.id === entry.id)?.outcome === 'correct',
  )
  const result = {
    assessments,
    cases,
    correct: cases.filter((entry) => entry.correct).length,
    datasetHash: digest(JSON.stringify(golden)),
    errors: assessments.filter((entry) => !entry.result.ok).length,
    name: definition.name,
    referenceBaseline: definition.baseline,
    referenceDiagnostic: definition.diagnostic,
    regressions,
    sourceUnits: state.value,
  }
  results.push(result)
  await writeArtifact({
    path: fileURLToPath(new URL(`${run}-${definition.name}.json`, import.meta.url)),
    value: result,
  })
}
const after = await resolveQuestionModel({baseUrl, model: model.value.name})
assert.deepEqual(after, model)
await writeArtifact({
  path: fileURLToPath(new URL(`${run}-summary.json`, import.meta.url)),
  value: {
    cacheReads: 0,
    finishedAt: new Date().toISOString(),
    implementation: {sha256: digest(source), source},
    kind: 'adapter-experiment',
    model: model.value,
    promptVersion: 7,
    results: results.map(({name, cases, correct, errors, regressions}) => ({
      correct,
      errors,
      name,
      regressions,
      total: cases.length,
    })),
    scope:
      'Reclassifies every pair from prior complete diagnostics; does not rerun retrieval or doctor.',
    startedAt,
  },
})
