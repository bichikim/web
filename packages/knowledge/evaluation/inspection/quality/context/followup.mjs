import assert from 'node:assert/strict'
import {mkdir, readFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {createJiti} from 'jiti'

const [recordPath, repository, output, evidence, flow = 'replay'] = process.argv.slice(2)
assert.ok(recordPath && repository && output)
assert.ok(['replay', 'full'].includes(flow))
assert.ok(['present', 'absent'].includes(evidence))
assert.ok(process.env.KNOWLEDGE_COLLECTION?.startsWith('knowledge-context-'))
const read = async (path) => JSON.parse(await readFile(path, 'utf8'))
const record = await read(recordPath)
const input = await read(resolve(dirname(recordPath), 'input.json'))
const item = input.cases.find((entry) => entry.id === record.id)
assert.ok(item)
assert.equal(record.result.research.stop, 'no-new-queries')
assert.ok(record.result.research.reused.decision.audits.some((audit) => !audit.supported))
const frozen = flow === 'full' ? 0 : record.trace.length - 1
assert.ok(record.trace.at(-1).request.prompt.startsWith('For eligible questions return'))
const jiti = createJiti(import.meta.url)
const {indexKnowledgeRepository, loadInspectionSource} = await jiti.import(
  '../../../../src/cli/runtime.ts',
)
const {classifyResearchPair} = await jiti.import(
  '../../../../src/adapters/experimental/research.ts',
)
const {resolveQuestionModel} = await jiti.import('../../../../src/adapters/questions.ts')
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
const {RESEARCH_INSPECTION_VERSION, RESEARCH_LIMITS} = await jiti.import(
  '../../../../src/inspection/research.ts',
)
await mkdir(output, {recursive: true})
await Promise.all(
  ['input', 'result'].map((name) => assertArtifactAbsent(resolve(output, `${name}.json`))),
)
const indexed = await indexKnowledgeRepository(repository)
const source = await loadInspectionSource(repository)
assert.ok(source.research)
assert.deepEqual(
  source.points.filter((point) => input.points.some((old) => old.pointId === point.pointId)),
  input.points,
)
const extra = source.points.filter(
  (point) => !input.points.some((old) => old.pointId === point.pointId),
)
assert.equal(extra.length, evidence === 'present' ? 1 : 0)
if (evidence === 'present') {
  assert.equal(extra[0].payload.docId, 'experiment/feed-coverage')
  assert.ok(!item.linked.some((point) => point.pointId === extra[0].pointId))
}
assert.deepEqual(await resolveQuestionModel({baseUrl: source.ollamaUrl, model: input.model.name}), {
  ok: true,
  value: input.model,
})
const expected = evidence === 'present' ? 'conflict' : 'uncertain'
await writeArtifact({
  path: resolve(output, 'input.json'),
  value: {
    authority:
      evidence === 'present' ? 'synthetic-condition-not-production-policy' : item.authority,
    collection: process.env.KNOWLEDGE_COLLECTION,
    evidence,
    expected,
    flow,
    frozenPriorResponses: frozen,
    indexed,
    model: input.model,
    pair: item.pair,
    planner: flow === 'full' ? 'production' : 'without-verdict',
    points: source.points,
    promptVersion: RESEARCH_INSPECTION_VERSION,
    recordPath,
  },
})
const trace = []
const queries = []
const nativeFetch = globalThis.fetch
globalThis.fetch = async (url, options) => {
  const target = new URL(url)
  assert.ok(['http://127.0.0.1:11434', 'http://127.0.0.1:6333'].includes(target.origin))
  if (target.pathname !== '/api/generate') {
    return nativeFetch(url, options)
  }
  let request = JSON.parse(options.body)
  if (trace.length < frozen) {
    const previous = record.trace[trace.length]
    assert.deepEqual(request, previous.request)
    trace.push({...previous, replayed: true})
    return Response.json(previous.response)
  }
  if (flow === 'replay' && request.prompt.startsWith('For eligible questions return')) {
    const prefix = ' Assessment: '
    const start = request.prompt.indexOf(prefix)
    const end = request.prompt.indexOf('. Sources: ', start)
    assert.ok(start > 0 && end > start)
    const prior = JSON.parse(request.prompt.slice(start + prefix.length, end))
    assert.ok(prior.kind && typeof prior.reason === 'string')
    const original = {left: item.pair.left.payload.text, right: item.pair.right.payload.text}
    const head = request.prompt.slice(0, start)
    const tail = request.prompt.slice(end)
    request = {
      ...request,
      prompt: `${head} Original: ${JSON.stringify(original)}${tail}`,
    }
  }
  const response = await nativeFetch(url, {...options, body: JSON.stringify(request)})
  trace.push({replayed: false, request, response: await response.clone().json()})
  console.log(JSON.stringify({completedGeneration: trace.length, evidence, flow}))
  return response
}
const start = Date.now()
let result
try {
  result = await classifyResearchPair({
    baseUrl: source.ollamaUrl,
    linked: item.linked,
    model: input.model,
    pair: item.pair,
    points: source.points,
    reader: {
      search: async (options) => {
        const found = await source.research.search(options)
        queries.push({...options, found})
        return found
      },
    },
  })
} finally {
  globalThis.fetch = nativeFetch
}
assert.deepEqual((await loadInspectionSource(repository)).points, source.points)
assert.deepEqual(await resolveQuestionModel({baseUrl: source.ollamaUrl, model: input.model.name}), {
  ok: true,
  value: input.model,
})
const report = {
  correct: result.ok && result.value.kind === expected,
  elapsedMs: Date.now() - start,
  evidence,
  expected,
  frozenPriorResponses: frozen,
  liveCalls: trace.filter((entry) => !entry.replayed).length,
  modelAndSnapshotUnchanged: true,
  queries,
  result,
  trace,
}
await writeArtifact({path: resolve(output, 'result.json'), value: report})
console.log(
  JSON.stringify({
    ...report,
    queries: queries.map(({query, found}) => ({
      hits: found.value?.map((point) => point.pointId),
      query,
    })),
    result: {error: result.error, ok: result.ok, stop: result.research?.stop, value: result.value},
    trace: undefined,
  }),
)
assert.ok(result.ok)
assert.ok(report.correct)
assert.ok(queries.length > 0)
assert.ok(queries.length <= RESEARCH_LIMITS.queries * RESEARCH_LIMITS.rounds)
assert.ok(result.research.rounds.length <= RESEARCH_LIMITS.rounds)
const maximumCalls = 14
assert.ok(trace.length <= maximumCalls)
assert.ok(
  result.research.selection.sources.reduce((total, point) => total + point.text.length, 0) <=
    RESEARCH_LIMITS.text,
)
if (flow === 'replay') {
  assert.ok(result.research.reused.decision.audits.some((audit) => !audit.supported))
}
if (evidence === 'present') {
  const id = extra[0].pointId
  assert.ok(queries.some(({found}) => found.value?.some((point) => point.pointId === id)))
  assert.ok(
    result.research.journal.questions.some((question) =>
      question.evidence.some((point) => point.pointId === id),
    ),
  )
  assert.equal(result.research.stop, 'resolved')
  assert.deepEqual(result.research.unresolved, [])
} else {
  assert.ok(result.research.unresolved.length > 0)
}
