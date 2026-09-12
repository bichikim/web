import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {createHash} from 'node:crypto'
import {cp, mkdir, mkdtemp, readdir, readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {basename, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import {createJiti} from 'jiti'

const [destination, version = '19', previous, searchMode = 'live', selected] = process.argv.slice(2)
assert.ok(['live', 'withheld'].includes(searchMode))
const frozenVersion = Number(version)
assert.ok(Number.isInteger(frozenVersion))
const REPEATS = 3
const MAX_CALLS = 14
const MAX_SEARCHES = 6
const MAX_CHARACTERS = 12000
assert.ok(destination, 'Pass a new output directory')
const output = resolve(destination)
const here = fileURLToPath(new URL('.', import.meta.url))
const jiti = createJiti(import.meta.url)
const {indexKnowledgeRepository, loadInspectionSource} = await jiti.import(
  '../../../../src/cli/runtime.ts',
)
const {classifyResearchPair} = await jiti.import(
  '../../../../src/adapters/experimental/research.ts',
)
const {resolveQuestionModel} = await jiti.import('../../../../src/adapters/questions.ts')
const {writeArtifact, assertArtifactAbsent} = await jiti.import('../../../../src/cli/artifacts.ts')
const {RESEARCH_INSPECTION_VERSION} = await jiti.import('../../../../src/inspection/research.ts')
assert.equal(RESEARCH_INSPECTION_VERSION, frozenVersion)
await assertArtifactAbsent(output)
await mkdir(output, {recursive: true})
const save = (name, value) => writeArtifact({path: join(output, name), value})
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const tree = async (directory) => {
  const entries = await readdir(directory, {withFileTypes: true})
  const groups = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const path = join(directory, entry.name)
        return entry.isDirectory()
          ? Object.fromEntries(
              Object.entries(await tree(path)).map(([key, value]) => [
                `${entry.name}/${key}`,
                value,
              ]),
            )
          : {[entry.name]: hash(await readFile(path))}
      }),
  )
  return Object.assign({}, ...groups)
}
const fingerprint = async () => ({
  cases: hash(await readFile(join(here, 'cases.json'))),
  corpus: await tree(join(here, 'corpus')),
  product: await tree(resolve(here, '../../../../src')),
  runner: hash(await readFile(fileURLToPath(import.meta.url))),
})
const frozen = await fingerprint()
const definitions = JSON.parse(await readFile(join(here, 'cases.json'), 'utf8'))
const baseline = previous === undefined ? undefined : JSON.parse(await readFile(previous, 'utf8'))
if (baseline !== undefined) {
  assert.deepEqual(frozen.corpus, baseline.frozen.corpus)
  assert.equal(frozen.cases, baseline.frozen.cases)
}
const repository = baseline?.repository ?? (await mkdtemp(join(tmpdir(), 'knowledge-transfer-')))
assert.ok(basename(repository).startsWith('knowledge-transfer-'))
if (baseline === undefined) {
  await cp(join(here, 'corpus'), repository, {recursive: true})
  const execute = promisify(execFile)
  await execute('git', ['init', '-b', 'main', repository])
  await execute('git', [
    '-C',
    repository,
    '-c',
    'user.name=Knowledge Evaluation',
    '-c',
    'user.email=evaluation@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--allow-empty',
    '-m',
    'chore: Initialize evaluation repository',
  ])
}
process.env.KNOWLEDGE_COLLECTION = basename(repository)
process.env.KNOWLEDGE_QDRANT_URL = 'http://127.0.0.1:6333'
process.env.KNOWLEDGE_OLLAMA_URL = 'http://127.0.0.1:11434'
const nativeFetch = globalThis.fetch
let trace = []
globalThis.fetch = async (input, options) => {
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
  )
  assert.ok(['http://127.0.0.1:6333', 'http://127.0.0.1:11434'].includes(url.origin))
  const response = await nativeFetch(input, options)
  if (url.pathname === '/api/generate') {
    trace.push({request: JSON.parse(options.body), response: await response.clone().json()})
    console.log(JSON.stringify({calls: trace.length, stage: 'generated'}))
  }
  return response
}
const indexed = await indexKnowledgeRepository(repository)
const source = await loadInspectionSource(repository)
assert.equal(source.repoId, 'demo/inspection-transfer')
assert.ok(source.research)
const resolved = await resolveQuestionModel({baseUrl: source.ollamaUrl, model: 'gemma4:31b-mlx'})
assert.ok(resolved.ok)
const model = resolved.value
if (baseline !== undefined) {
  assert.deepEqual(source.points, baseline.points)
  assert.deepEqual(model, baseline.model)
}
const locate = (id, unit) => {
  const point = source.points.find(
    (p) => p.payload.docId === `case/${id}` && p.payload.unitId === unit,
  )
  assert.ok(point, `${id}#${unit}`)
  return point
}
const cases = definitions.cases
  .filter(
    (item) =>
      (searchMode === 'live' || item.id === 'revalidation') &&
      (selected === undefined || item.id === selected),
  )
  .map((item) => ({
    ...item,
    ...(searchMode === 'withheld'
      ? {
          expected: 'uncertain',
          reason:
            'The required directive definition is withheld; do not substitute remembered knowledge.',
        }
      : {}),
    pair: {left: locate(item.id, 'left'), right: locate(item.id, 'right')},
  }))
assert.ok(cases.length > 0)
await save('input.json', {
  authority:
    searchMode === 'live' ? definitions.authority : 'withheld-evidence-control-not-user-approved',
  cases,
  frozen,
  indexed,
  model,
  points: source.points,
  repository,
  searchMode,
  selected,
  version: RESEARCH_INSPECTION_VERSION,
})
const results = []
for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
  for (const item of cases) {
    trace = []
    const queries = []
    const start = Date.now()
    console.log(JSON.stringify({id: item.id, repeat, stage: 'start'}))
    // eslint-disable-next-line no-await-in-loop -- Isolate each model sequence and its request trace.
    const result = await classifyResearchPair({
      baseUrl: source.ollamaUrl,
      linked: [],
      model,
      pair: item.pair,
      points: source.points,
      reader: {
        search: async (options) => {
          const found =
            searchMode === 'live' ? await source.research.search(options) : {ok: true, value: []}
          queries.push({found, options})
          return found
        },
      },
    })
    const selected = result.research?.selection.sources ?? []
    const relevant = new Set(
      source.points.filter((p) => p.payload.docId === item.reference).map((p) => p.pointId),
    )
    const record = {
      actual: result.value?.kind,
      agrees: result.ok && result.value.kind === item.expected,
      calls: trace.length,
      contextCharacters: selected.reduce((sum, p) => sum + p.text.length, 0),
      elapsedMs: Date.now() - start,
      error: result.error,
      expected: item.expected,
      id: item.id,
      networkSearches: searchMode === 'live' ? queries.length : 0,
      referenceFound: queries.some((query) =>
        (query.found.value ?? []).some((point) => relevant.has(point.pointId)),
      ),
      referenceSelected: selected.some((p) => relevant.has(p.pointId)),
      repeat,
      searches: queries.length,
    }
    // eslint-disable-next-line no-await-in-loop -- Preserve completed results before the next inference.
    await save(`${repeat}-${item.id}.json`, {...record, queries, result, trace})
    results.push(record)
    console.log(JSON.stringify({stage: 'done', ...record}))
    assert.ok(
      record.calls <= MAX_CALLS &&
        record.searches <= MAX_SEARCHES &&
        record.contextCharacters <= MAX_CHARACTERS,
    )
  }
}
assert.deepEqual(await fingerprint(), frozen)
assert.deepEqual((await loadInspectionSource(repository)).points, source.points)
assert.deepEqual(
  await resolveQuestionModel({baseUrl: source.ollamaUrl, model: 'gemma4:31b-mlx'}),
  resolved,
)
await save('summary.json', {
  consistency: cases.map((item) => ({
    id: item.id,
    outcomes: results.filter((r) => r.id === item.id).map((r) => r.error ?? r.actual),
  })),
  frozenUnchanged: true,
  modelUnchanged: true,
  results,
  snapshotUnchanged: true,
})
