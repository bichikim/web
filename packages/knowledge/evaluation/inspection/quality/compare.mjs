import assert from 'node:assert/strict'
import {mkdir, readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createJiti} from 'jiti'

const [repository, labelsPath, output, policyPath, mode = 'compare'] = process.argv.slice(2)
assert.ok(repository && labelsPath && output && policyPath)
assert.ok(['compare', 'candidate', 'production'].includes(mode))
const jiti = createJiti(import.meta.url)
const {loadInspectionSource} = await jiti.import('../../../src/cli/runtime.ts')
const {classifyResearchPair} = await jiti.import('../../../src/adapters/experimental/research.ts')
const {resolveQuestionModel} = await jiti.import('../../../src/adapters/questions.ts')
const {writeArtifact} = await jiti.import('../../../src/cli/artifacts.ts')
const {RESEARCH_INSPECTION_VERSION} = await jiti.import('../../../src/inspection/research.ts')
const labelsText = await readFile(labelsPath, 'utf8')
const labels = JSON.parse(labelsText)
assert.ok(['golden', 'reviewed'].includes(labels.kind))
const cases =
  labels.kind === 'reviewed'
    ? labels.cases.filter((item) => item.review.status === 'approved')
    : labels.cases
assert.ok(cases.length > 0)
const policy = JSON.parse(await readFile(policyPath, 'utf8'))
const separator = 'Pair: '
const boundary = policy.request.prompt.indexOf(separator)
assert.ok(boundary > 0)
const instruction = policy.request.prompt.slice(0, boundary)
const nativeFetch = globalThis.fetch
let variant = 'baseline'
let trace = []
let replacements = 0
let classificationReplacements = 0
globalThis.fetch = async (input, options) => {
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
  )
  assert.ok(['http://127.0.0.1:6333', 'http://127.0.0.1:11434'].includes(url.origin))
  let request
  let sent = options
  if (url.pathname === '/api/generate') {
    request = JSON.parse(options.body)
    if (
      variant === 'candidate' &&
      policy.classification !== undefined &&
      request.prompt.startsWith('Compare only what the source units explicitly state.')
    ) {
      const marker = 'JSON schema: '
      const target = request.prompt.indexOf(marker)
      const candidate = policy.classification.prompt.indexOf(marker)
      assert.ok(target > 0 && candidate > 0)
      request = {
        ...request,
        prompt: policy.classification.prompt.slice(0, candidate) + request.prompt.slice(target),
      }
      sent = {...options, body: JSON.stringify(request)}
      classificationReplacements += 1
    }
    if (
      variant === 'candidate' &&
      request.prompt.startsWith('Identify up to three missing definitions')
    ) {
      const start = request.prompt.indexOf(separator)
      assert.ok(start > 0)
      request = {...request, prompt: instruction + request.prompt.slice(start)}
      sent = {...options, body: JSON.stringify(request)}
      replacements += 1
    }
  }
  const response = await nativeFetch(input, sent)
  if (request !== undefined) {
    trace.push({request, response: await response.clone().json()})
  }
  return response
}
const source = await loadInspectionSource(repository)
assert.ok(source.research)
assert.equal(source.repoId, labels.repoId)
assert.equal(source.workspaceId, labels.workspaceId)
const model = await resolveQuestionModel({baseUrl: source.ollamaUrl, model: policy.model.name})
assert.ok(model.ok)
assert.deepEqual(model.value, policy.model)
await mkdir(output, {recursive: true})
const save = (name, value) => writeArtifact({path: resolve(output, name), value})
await save('input.json', {
  collection: process.env.KNOWLEDGE_COLLECTION,
  evaluatedCases: cases.length,
  excludedCases: labels.cases.length - cases.length,
  instruction,
  labels,
  mode,
  model: model.value,
  points: source.points,
  promptVersion: RESEARCH_INSPECTION_VERSION,
  repository,
})
const results = []
for (const item of cases) {
  const locate = (reference) => {
    const point = source.points.find(
      ({payload}) => payload.docId === reference.docId && payload.unitId === reference.unitId,
    )
    assert.ok(point)
    assert.equal(point.payload.contentHash, reference.contentHash)
    return point
  }
  const pair = {left: locate(item.left), right: locate(item.right)}
  const variants = mode === 'compare' ? ['baseline', 'candidate'] : [mode]
  for (const next of variants) {
    variant = next
    trace = []
    replacements = 0
    classificationReplacements = 0
    const queries = []
    const start = Date.now()
    console.log(JSON.stringify({id: item.id, stage: 'start', variant}))
    // eslint-disable-next-line no-await-in-loop -- Keep one model request sequence active and attribute its trace to one case.
    const result = await classifyResearchPair({
      baseUrl: source.ollamaUrl,
      model: model.value,
      pair,
      points: source.points,
      reader: {
        search: async (options) => {
          queries.push(options.query)
          return source.research.search(options)
        },
      },
    })
    const expected = item.expected ?? item.review.accepted
    const accepted = Array.isArray(expected) ? expected : [expected]
    const record = {
      actual: result.value?.kind,
      classificationReplacements,
      correct: result.ok && accepted.includes(result.value.kind),
      elapsedMs: Date.now() - start,
      error: result.error,
      expected,
      id: item.id,
      queries,
      replacements,
      variant,
    }
    // eslint-disable-next-line no-await-in-loop -- Persist the current trace before the next case replaces it.
    await save(`${item.id}-${variant}.json`, {...record, result, trace})
    if (variant === 'candidate' && result.ok) {
      assert.equal(replacements, 1)
      assert.equal(classificationReplacements, policy.classification === undefined ? 0 : 1)
    }
    results.push(record)
    console.log(JSON.stringify({stage: 'done', ...record, queries: queries.length}))
  }
}
assert.deepEqual((await loadInspectionSource(repository)).points, source.points)
assert.equal(await readFile(labelsPath, 'utf8'), labelsText)
await save('summary.json', {labelsUnchanged: true, results, snapshotUnchanged: true})
