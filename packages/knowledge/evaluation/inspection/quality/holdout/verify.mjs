import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createJiti} from 'jiti'

const [directory, output] = process.argv.slice(2)
assert.ok(directory && output)
const read = async (name) => JSON.parse(await readFile(resolve(directory, name), 'utf8'))
const input = await read('input.json')
const summary = await read('summary.json')
const jiti = createJiti(import.meta.url)
const {classifyResearchPair} = await jiti.import(
  '../../../../src/adapters/experimental/research.ts',
)
const {RESEARCH_INSPECTION_VERSION, RESEARCH_LIMITS} = await jiti.import(
  '../../../../src/inspection/research.ts',
)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
assert.equal(input.version, RESEARCH_INSPECTION_VERSION)
assert.ok(summary.frozenUnchanged && summary.snapshotUnchanged && summary.modelUnchanged)
await assertArtifactAbsent(output)
const repeats = 3
assert.equal(summary.results.length, input.cases.length * repeats)
assert.equal(
  new Set(summary.results.map((row) => `${row.repeat}-${row.id}`)).size,
  summary.results.length,
)
const nativeFetch = globalThis.fetch
const measurements = []
const initialRequests = new Map()
try {
  for (const row of summary.results) {
    const item = input.cases.find((entry) => entry.id === row.id)
    assert.ok(item && row.repeat >= 1 && row.repeat <= repeats)
    // eslint-disable-next-line no-await-in-loop -- Replay one recorded sequence at a time.
    const record = await read(`${row.repeat}-${row.id}.json`)
    if (initialRequests.has(row.id)) {
      assert.deepEqual(record.trace[0].request, initialRequests.get(row.id))
    } else {
      initialRequests.set(row.id, record.trace[0].request)
    }
    let calls = 0
    let searches = 0
    globalThis.fetch = async (url, options) => {
      const target = new URL(url)
      assert.equal(target.origin, 'http://127.0.0.1:11434')
      if (target.pathname === '/api/tags') {
        return Response.json({models: [input.model]})
      }
      assert.equal(target.pathname, '/api/generate')
      const entry = record.trace[calls]
      calls += 1
      assert.ok(entry)
      assert.deepEqual(JSON.parse(options.body), entry.request)
      return Response.json(entry.response)
    }
    // eslint-disable-next-line no-await-in-loop -- Exercise production control flow without a live model.
    const result = await classifyResearchPair({
      baseUrl: 'http://127.0.0.1:11434',
      linked: [],
      model: input.model,
      pair: item.pair,
      points: input.points,
      reader: {
        search: async (options) => {
          const entry = record.queries[searches]
          searches += 1
          assert.ok(entry)
          assert.deepEqual(options, entry.options)
          return entry.found
        },
      },
    })
    assert.equal(calls, record.trace.length)
    assert.equal(searches, record.queries.length)
    assert.deepEqual(JSON.parse(JSON.stringify(result)), record.result)
    assert.equal(row.expected, item.expected)
    assert.equal(row.agrees, result.ok && result.value.kind === item.expected)
    assert.ok(searches <= RESEARCH_LIMITS.queries * RESEARCH_LIMITS.rounds)
    const relevant = new Set(
      input.points
        .filter((point) => item.requiredEvidence.includes(point.payload.docId))
        .map((point) => point.pointId),
    )
    const evidence =
      result.research?.journal.questions.flatMap((question) => question.evidence) ?? []
    measurements.push({
      calls,
      id: row.id,
      referenceCited: result.ok ? evidence.some((entry) => relevant.has(entry.pointId)) : null,
      repeat: row.repeat,
      searches,
    })
  }
} finally {
  globalThis.fetch = nativeFetch
}
await writeArtifact({
  path: output,
  value: {identicalInitialRequests: true, measurements, recordedResponseReplay: true},
})
console.log(JSON.stringify({replayed: measurements.length}))
