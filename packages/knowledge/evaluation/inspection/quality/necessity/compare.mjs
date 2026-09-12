import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createJiti} from 'jiti'

const [baseline, candidate, output] = process.argv.slice(2)
assert.ok(baseline && candidate && output)
const jiti = createJiti(import.meta.url)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
await assertArtifactAbsent(output)
const read = async (directory, name) => JSON.parse(await readFile(join(directory, name), 'utf8'))
const before = await read(baseline, 'input.json')
const after = await read(candidate, 'input.json')
assert.deepEqual(before.cases, after.cases)
assert.deepEqual(before.points, after.points)
assert.deepEqual(before.model, after.model)
assert.deepEqual(before.frozen.corpus, after.frozen.corpus)
assert.equal(before.frozen.cases, after.frozen.cases)
const REPEATS = 3
const summaries = []
for (const directory of [baseline, candidate]) {
  // eslint-disable-next-line no-await-in-loop -- Check each completed run before aggregating it.
  const summary = await read(directory, 'summary.json')
  assert.ok(summary.frozenUnchanged && summary.snapshotUnchanged && summary.modelUnchanged)
  assert.equal(summary.results.length, after.cases.length * REPEATS)
  const identifiers = summary.results.map((row) => `${row.repeat}-${row.id}`)
  assert.equal(new Set(identifiers).size, summary.results.length)
  const totals = {calls: 0, inputTokens: 0, outputTokens: 0, searches: 0}
  for (const row of summary.results) {
    assert.ok(row.agrees && row.error === undefined)
    // eslint-disable-next-line no-await-in-loop -- Verify the recorded trace backing each row.
    const record = await read(directory, `${row.repeat}-${row.id}.json`)
    assert.equal(record.trace.length, row.calls)
    assert.equal(record.queries.length, row.searches)
    totals.calls += row.calls
    totals.searches += row.searches
    for (const entry of record.trace) {
      assert.ok(Number.isInteger(entry.response.prompt_eval_count))
      assert.ok(Number.isInteger(entry.response.eval_count))
      totals.inputTokens += entry.response.prompt_eval_count
      totals.outputTokens += entry.response.eval_count
    }
  }
  summaries.push({directory, results: summary.results, totals})
}
await writeArtifact({path: output, value: {sameCasesPointsModel: true, summaries}})
console.log(JSON.stringify(summaries.map(({directory, totals}) => ({directory, totals}))))
