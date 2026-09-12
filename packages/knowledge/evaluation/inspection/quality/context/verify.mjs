import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createJiti} from 'jiti'

const [baseline, candidate, output] = process.argv.slice(2)
assert.ok(baseline && candidate && output)
const read = async (directory, file) => JSON.parse(await readFile(resolve(directory, file), 'utf8'))
const before = await read(baseline, 'input.json')
const input = await read(candidate, 'input.json')
const summary = await read(candidate, 'summary.json')
assert.deepEqual(before.points, input.points)
assert.deepEqual(
  before.cases.filter((item) => input.selected === undefined || item.id === input.selected),
  input.cases,
)
assert.ok(input.cases.length > 0)
assert.deepEqual(before.model, input.model)
assert.equal(before.instruction, '')
assert.equal(input.instruction, '')
assert.equal(input.provider, undefined)
assert.equal(summary.approvalsUnchanged, true)
assert.equal(summary.snapshotUnchanged, true)
const jiti = createJiti(import.meta.url)
const {classifyResearchPair} = await jiti.import(
  '../../../../src/adapters/experimental/research.ts',
)
const {RESEARCH_INSPECTION_VERSION, RESEARCH_LIMITS} = await jiti.import(
  '../../../../src/inspection/research.ts',
)
const {assertArtifactAbsent, writeArtifact} = await jiti.import('../../../../src/cli/artifacts.ts')
assert.equal(input.promptVersion, RESEARCH_INSPECTION_VERSION)
await assertArtifactAbsent(output)
const measurements = []
const nativeFetch = globalThis.fetch
const maximumCalls = 14
const maximumAudits = RESEARCH_LIMITS.rounds + 1
const verifyDecision = (decision) => {
  for (const audit of decision.audits ?? []) {
    assert.ok(audit.question && audit.answer && audit.sources.length > 0)
    assert.ok(audit.evidence.every((id) => audit.sources.some((source) => source.id === id)))
    assert.ok(audit.supported || decision.unresolved.includes(audit.missing.trim()))
    if (audit.checks !== undefined) {
      for (const check of Object.values(audit.checks)) {
        assert.equal(check.questionId, audit.questionId)
        assert.ok(check.evidence.every((id) => audit.sources.some((source) => source.id === id)))
      }
      assert.equal(
        audit.supported,
        audit.checks.evidence.supported && audit.checks.answers.supported,
      )
    }
  }
}
try {
  for (const row of summary.results) {
    const name = `${row.id}-${row.mode}.json`
    // eslint-disable-next-line no-await-in-loop -- Replay one complete recorded sequence at a time.
    const [old, record] = await Promise.all([read(baseline, name), read(candidate, name)])
    const item = input.cases.find((entry) => entry.id === row.id)
    assert.ok(item)
    assert.deepEqual(row.expected, item.expected[row.mode])
    assert.deepEqual(old.trace[0].request, record.trace[0].request)
    assert.ok(record.trace.length <= maximumCalls)
    assert.ok(record.queries.length <= RESEARCH_LIMITS.queries * RESEARCH_LIMITS.rounds)
    const audits = record.trace.filter((entry) =>
      entry.request.prompt.startsWith('Audit whether each proposed answer'),
    )
    assert.ok(audits.length <= maximumAudits)
    const independent = record.trace.filter((entry) =>
      entry.request.prompt.startsWith('Determine whether the supplied cited passages'),
    )
    assert.ok(independent.length <= maximumAudits)
    assert.ok(independent.length >= audits.length && independent.length <= audits.length + 1)
    if (record.result.ok) {
      assert.equal(independent.length, audits.length)
    }
    let calls = 0
    let queries = 0
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
    // eslint-disable-next-line no-await-in-loop -- Verify the current production path against recorded network responses.
    const result = await classifyResearchPair({
      baseUrl: 'http://127.0.0.1:11434',
      linked: row.mode === 'direct' ? item.linked : [],
      model: input.model,
      pair: item.pair,
      points: input.points,
      reader: {
        search: async ({query, limit}) => {
          const entry = record.queries[queries]
          queries += 1
          assert.ok(entry)
          assert.equal(query, entry.query)
          assert.equal(limit, RESEARCH_LIMITS.results)
          return entry.found
        },
      },
    })
    assert.equal(calls, record.trace.length)
    assert.equal(queries, record.queries.length)
    assert.equal(result.ok, record.result.ok)
    assert.deepEqual(result.error, record.result.error)
    assert.deepEqual(result.value, record.result.value)
    assert.equal(row.correct, result.ok && row.expected.includes(result.value.kind))
    if (result.ok) {
      assert.deepEqual(result.research, record.result.research)
      assert.ok(result.research.rounds.length <= RESEARCH_LIMITS.rounds)
      assert.ok(
        result.research.selection.sources.reduce((total, point) => total + point.text.length, 0) <=
          RESEARCH_LIMITS.text,
      )
      const decisions = [
        result.research.reused?.decision,
        ...result.research.rounds.map((round) => round.decision),
      ].filter(Boolean)
      decisions.forEach(verifyDecision)
    }
    measurements.push({
      audits: audits.length,
      before: old.actual,
      beforeCorrect: old.correct,
      calls,
      correct: row.correct,
      id: row.id,
      independent: independent.length,
      mode: row.mode,
      queries,
      replayed: result,
    })
  }
} finally {
  globalThis.fetch = nativeFetch
}
const expected = input.cases
  .flatMap((item) => input.modes.map((mode) => `${item.id}-${mode}`))
  .sort()
assert.deepEqual(measurements.map((row) => `${row.id}-${row.mode}`).sort(), expected)
const report = {
  actualNetworkRun: candidate,
  baseline,
  baselinePassed: measurements.filter((row) => row.beforeCorrect).length,
  candidatePassed: measurements.filter((row) => row.correct).length,
  errors: summary.results.filter((row) => row.error !== undefined).length,
  measurements,
  recordedResponseReplay: true,
  samePointsCasesModelAndInitialRequest: true,
  searchAndAuditBoundsVerified: true,
  total: measurements.length,
}
await writeArtifact({path: output, value: report})
console.log(
  JSON.stringify({...report, measurements: measurements.map(({replayed, ...row}) => row)}),
)
