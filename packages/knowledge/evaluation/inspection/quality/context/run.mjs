import assert from 'node:assert/strict'
import {mkdir, readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createJiti} from 'jiti'
import {instructions} from './instructions.mjs'

const [
  repository,
  output,
  scope = 'all',
  modeList = 'excerpt,direct,search',
  assessment = 'original',
  modelName = 'gemma4:latest',
  selected,
] = process.argv.slice(2)
assert.ok(repository && output)
assert.ok(['gemma4:latest', 'gemma4:31b-mlx', 'gpt-5.6-luna'].includes(modelName))
assert.ok(Object.hasOwn(instructions, assessment))
const instruction = instructions[assessment]
assert.ok(['all', 'solid'].includes(scope))
const modes = modeList.split(',')
assert.ok(modes.length > 0 && new Set(modes).size === modes.length)
assert.ok(modes.every((mode) => ['excerpt', 'direct', 'search'].includes(mode)))
assert.ok(process.env.KNOWLEDGE_COLLECTION?.startsWith('knowledge-context-'))
const jiti = createJiti(import.meta.url)
const {indexKnowledgeRepository, loadInspectionSource} = await jiti.import(
  '../../../../src/cli/runtime.ts',
)
const {classifyResearchPair} = await jiti.import(
  '../../../../src/adapters/experimental/research.ts',
)
const {resolveQuestionModel} = await jiti.import('../../../../src/adapters/questions.ts')
const {writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
const {RESEARCH_INSPECTION_VERSION} = await jiti.import('../../../../src/inspection/research.ts')
await mkdir(output, {recursive: true})
const save = (name, value) => writeArtifact({path: resolve(output, name), value})
const nativeFetch = globalThis.fetch
const pi =
  modelName === 'gpt-5.6-luna'
    ? await (await import('./pi.mjs')).createPiTransport({nativeFetch})
    : undefined
let trace = []
let assessmentReplacements = 0
globalThis.fetch = async (input, options) => {
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
  )
  // pi refreshes OAuth through global fetch; never include that exchange in the document trace.
  if (pi && url.href === 'https://auth.openai.com/oauth/token') {
    return nativeFetch(input, options)
  }
  assert.ok(['http://127.0.0.1:6333', 'http://127.0.0.1:11434'].includes(url.origin))
  if (pi && url.pathname === '/api/tags') {
    return pi.tags()
  }
  let sent = options
  if (url.pathname === '/api/generate' && instruction !== '') {
    const request = JSON.parse(options.body)
    if (request.prompt.startsWith('Reassess the original pair using the retrieved knowledge.')) {
      sent = {...options, body: JSON.stringify({...request, prompt: instruction + request.prompt})}
      assessmentReplacements += 1
    }
  }
  const response =
    pi && url.pathname === '/api/generate'
      ? await pi.request(JSON.parse(sent.body), sent.signal)
      : await nativeFetch(input, sent)
  if (url.pathname === '/api/generate') {
    trace.push({request: JSON.parse(sent.body), response: await response.clone().json()})
  }
  return response
}
const indexed = await indexKnowledgeRepository(repository)
const source = await loadInspectionSource(repository)
assert.equal(source.repoId, 'demo/inspection-context')
assert.ok(source.research)
const resolved = await resolveQuestionModel({baseUrl: source.ollamaUrl, model: modelName})
assert.ok(resolved.ok)
const model = resolved.value
const locate = (docId, unitId) => {
  const result = source.points.find((p) => p.payload.docId === docId && p.payload.unitId === unitId)
  assert.ok(result, `${docId}#${unitId}`)
  return result
}
const definitions = [
  ['signal-update', 'signal', 'update', 'duplicate'],
  ['signal-suppress', 'signal', 'suppress', 'conflict'],
  ['batch-once', 'batch', 'once', 'duplicate'],
  ['batch-twice', 'batch', 'twice', 'conflict'],
]
const candidates = definitions.map(([id, subject, right, expected]) => ({
  authority: 'experimental-hypothesis-not-user-approved',
  expected: {direct: [expected], excerpt: ['uncertain'], search: [expected]},
  id,
  linked: [
    locate(`reference/${subject}`, 'policy'),
    ...source.points.filter((point) => point.payload.docId === `measurement/${subject}`),
  ],
  pair: {left: locate(`case/${subject}`, 'base'), right: locate(`case/${subject}`, right)},
}))
const approvalText = await readFile(
  new URL('../../operations/reviewed.json', import.meta.url),
  'utf8',
)
const approved = JSON.parse(approvalText).cases.filter((item) => item.review.status === 'approved')
assert.equal(approved.length, 2)
for (const item of approved) {
  const pair = {
    left: locate(item.left.docId, item.left.unitId),
    right: locate(item.right.docId, item.right.unitId),
  }
  assert.equal(pair.left.payload.contentHash, item.left.contentHash)
  assert.equal(pair.right.payload.contentHash, item.right.contentHash)
  const paths =
    item.id === 'storage-backend'
      ? ['architecture.md', 'audio-library.md']
      : ['architecture.md', 'feed-dialogues.md']
  const linked = source.points.filter((p) =>
    paths.some((path) => p.payload.path === `docs/original/${path}`),
  )
  assert.ok(linked.length > 0)
  candidates.push({
    authority: 'user-approved-original-pair',
    expected: Object.fromEntries(
      ['excerpt', 'direct', 'search'].map((mode) => [mode, item.review.accepted]),
    ),
    id: item.id,
    linked,
    pair,
  })
}
const cases = candidates.filter((item) => selected === undefined || item.id === selected)
assert.ok(cases.length > 0)
await save('input.json', {
  assessment,
  cases,
  collection: process.env.KNOWLEDGE_COLLECTION,
  indexed,
  instruction,
  model,
  modes,
  points: source.points,
  promptVersion: RESEARCH_INSPECTION_VERSION,
  provider: pi?.metadata,
  scope,
  selected,
})
const results = []
for (const item of cases.filter(
  (entry) => scope === 'all' || entry.authority.startsWith('experimental-'),
)) {
  for (const mode of modes) {
    trace = []
    assessmentReplacements = 0
    const queries = []
    const start = Date.now()
    console.log(JSON.stringify({id: item.id, mode, stage: 'start'}))
    // eslint-disable-next-line no-await-in-loop -- Keep one local model sequence active so its trace belongs to this case.
    const result = await classifyResearchPair({
      baseUrl: source.ollamaUrl,
      linked: mode === 'direct' ? item.linked : [],
      model,
      pair: item.pair,
      points: source.points,
      reader: {
        search: async (options) => {
          const found =
            mode === 'search' ? await source.research.search(options) : {ok: true, value: []}
          queries.push({found, query: options.query})
          return found
        },
      },
    })
    const selected = result.research?.selection.sources ?? []
    if (mode === 'direct' && result.ok) {
      assert.equal(assessmentReplacements, assessment === 'original' ? 0 : 1)
    }
    const relevant = new Set(item.linked.map((p) => p.pointId))
    const record = {
      actual: result.value?.kind,
      assessmentReplacements,
      contextCharacters: selected.reduce((sum, p) => sum + p.text.length, 0),
      correct: result.ok && item.expected[mode].includes(result.value.kind),
      elapsedMs: Date.now() - start,
      error: result.error,
      expected: item.expected[mode],
      id: item.id,
      mode,
      promptTokens: trace.map((t) => t.response.prompt_eval_count),
      relevantHits: queries
        .flatMap((query) => query.found.value ?? [])
        .filter((p) => relevant.has(p.pointId))
        .map((p) => p.pointId),
      relevantRead: selected.filter((p) => relevant.has(p.pointId)).map((p) => p.pointId),
      searches: queries.length,
      truncated: result.research?.selection.truncated,
    }
    // eslint-disable-next-line no-await-in-loop -- Persist the trace before starting another model sequence.
    await save(`${item.id}-${mode}.json`, {...record, queries, result, trace})
    results.push(record)
    console.log(JSON.stringify({stage: 'done', ...record}))
  }
}
assert.deepEqual((await loadInspectionSource(repository)).points, source.points)
assert.equal(
  await readFile(new URL('../../operations/reviewed.json', import.meta.url), 'utf8'),
  approvalText,
)
await save('summary.json', {approvalsUnchanged: true, results, snapshotUnchanged: true})
