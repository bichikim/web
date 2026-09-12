import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createJiti} from 'jiti'

const [directory, selection, output] = process.argv.slice(2)
assert.ok(directory && selection && output)
const selected = selection.split(',')
assert.equal(new Set(selected).size, selected.length)
const read = async (name) => JSON.parse(await readFile(join(directory, name), 'utf8'))
const input = await read('input.json')
const summary = await read('summary.json')
const rows = summary.results.filter((row) => selected.includes(row.id))
assert.deepEqual([...new Set(rows.map((row) => row.id))].sort(), [...selected].sort())
const TRANSFER_REPEATS = 3
assert.equal(rows.length, selected.length * (input.version === undefined ? 1 : TRANSFER_REPEATS))
const jiti = createJiti(import.meta.url)
const {classifyResearchPair} = await jiti.import(
  '../../../../src/adapters/experimental/research.ts',
)
const {RESEARCH_INSPECTION_VERSION, RESEARCH_LIMITS} = await jiti.import(
  '../../../../src/inspection/research.ts',
)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await assertArtifactAbsent(output)
const nativeFetch = globalThis.fetch
const measurements = []
try {
  for (const row of rows) {
    assert.ok(row.agrees ?? row.correct)
    assert.ok(row.mode === undefined || row.mode === 'search')
    const item = input.cases.find((entry) => entry.id === row.id)
    assert.ok(item)
    const name = row.repeat === undefined ? `${row.id}-search.json` : `${row.repeat}-${row.id}.json`
    // eslint-disable-next-line no-await-in-loop -- Replay each complete recorded path in isolation.
    const record = await read(name)
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
    // eslint-disable-next-line no-await-in-loop -- A version change is allowed only when every request and result stays identical.
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
          assert.deepEqual(
            options,
            entry.options ?? {limit: RESEARCH_LIMITS.results, query: entry.query},
          )
          return entry.found
        },
      },
    })
    assert.equal(calls, record.trace.length)
    assert.equal(searches, record.queries.length)
    assert.deepEqual(JSON.parse(JSON.stringify(result)), record.result)
    measurements.push({calls, id: row.id, repeat: row.repeat, searches})
  }
} finally {
  globalThis.fetch = nativeFetch
}
await writeArtifact({
  path: output,
  value: {
    currentVersion: RESEARCH_INSPECTION_VERSION,
    directory,
    exactRequestsAndResults: true,
    measurements,
    networkCalls: 0,
    recordedVersion: input.version ?? input.promptVersion,
  },
})
console.log(JSON.stringify({replayed: rows.length}))
