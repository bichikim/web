import assert from 'node:assert/strict'
import {readFile, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {isDeepStrictEqual} from 'node:util'
import {nonReasoningTokens} from './usage.mjs'

const [baseline, candidate, output, axis = 'model'] = process.argv.slice(2)
assert.ok(baseline && candidate && output)
assert.ok(['model', 'assessment'].includes(axis))
const read = async (directory, file) => JSON.parse(await readFile(resolve(directory, file), 'utf8'))
const before = await read(baseline, 'input.json')
const after = await read(candidate, 'input.json')
assert.deepEqual(before.points, after.points)
assert.deepEqual(before.cases, after.cases)
assert.equal(before.promptVersion, after.promptVersion)
if (axis === 'assessment') {
  assert.equal(before.assessment, 'original')
  assert.equal(before.instruction, '')
  assert.ok(after.instruction.length > 0)
  assert.deepEqual(before.model, after.model)
  assert.equal(before.provider, undefined)
  assert.equal(after.provider, undefined)
} else {
  assert.equal(before.instruction, after.instruction)
}
assert.deepEqual(before.modes, after.modes)
assert.equal(before.scope, after.scope)
const baselineSummary = await read(baseline, 'summary.json')
const summary = await read(candidate, 'summary.json')
assert.equal(summary.approvalsUnchanged, true)
assert.equal(summary.snapshotUnchanged, true)
assert.equal(summary.results.length, after.cases.length * after.modes.length)
const expectedKeys = after.cases.flatMap((item) => after.modes.map((mode) => `${item.id}-${mode}`))
assert.deepEqual(
  summary.results.map((item) => `${item.id}-${item.mode}`).sort(),
  expectedKeys.sort(),
)
const measurements = []
const baselineTraces = (
  await Promise.all(expectedKeys.map((key) => read(baseline, `${key}.json`)))
).flatMap((record) => record.trace)
const limits = {queries: 3, results: 3, rounds: 2, text: 12000}
const promptPrefix = (prompt) =>
  prompt.split(/JSON schema: |Decision: |Pair: |Questions: |Prior: /u)[0]
// Follow-up data and schema enums can change with generated questions and selected context.
const configuration = ({prompt: _prompt, format: _format, ...rest}) => rest
for (const item of summary.results) {
  const filename = `${item.id}-${item.mode}.json`
  // eslint-disable-next-line no-await-in-loop -- Inspect one complete condition at a time.
  const [previous, current] = await Promise.all([
    read(baseline, filename),
    read(candidate, filename),
  ])
  assert.deepEqual(
    {...previous.trace[0].request, model: ''},
    {...current.trace[0].request, model: ''},
  )
  const approved = after.cases.find((entry) => entry.id === item.id)
  assert.deepEqual(item.expected, approved.expected[item.mode])
  assert.equal(item.actual, current.result.value?.kind)
  assert.equal(item.correct, current.result.ok && item.expected.includes(item.actual))
  assert.ok(item.searches <= limits.queries * limits.rounds)
  assert.ok(item.contextCharacters <= limits.text)
  assert.ok((current.result.research?.rounds.length ?? 0) <= limits.rounds)
  assert.ok(
    (current.result.research?.rounds ?? []).every(
      (round) =>
        round.queries.length <= limits.queries &&
        round.queries.every((query) => query.hits.length <= limits.results),
    ),
  )
  let outputTokens = 0
  let reasoningTokens = 0
  let replacements = 0
  for (const call of current.trace) {
    if (axis === 'assessment') {
      const prefixed = call.request.prompt.startsWith(after.instruction)
      const prompt = prefixed
        ? call.request.prompt.slice(after.instruction.length)
        : call.request.prompt
      const reassessment = prompt.startsWith(
        'Reassess the original pair using the retrieved knowledge.',
      )
      assert.equal(prefixed, reassessment)
      replacements += Number(prefixed)
      assert.equal(call.request.model, after.model.name)
      assert.equal(call.response.model, after.model.name)
      assert.ok(
        baselineTraces.some(
          (entry) =>
            isDeepStrictEqual(configuration(entry.request), configuration(call.request)) &&
            promptPrefix(entry.request.prompt) === promptPrefix(prompt),
        ),
      )
      outputTokens += call.response.eval_count ?? 0
    } else {
      assert.equal(call.response.pi.payload.model, after.model.name)
      assert.equal(call.response.pi.payload.instructions, call.request.system)
      assert.deepEqual(call.response.pi.payload.input, [
        {content: [{text: call.request.prompt, type: 'input_text'}], role: 'user'},
      ])
      assert.deepEqual(call.response.pi.payload.text.format.schema, call.request.format)
      assert.equal(call.response.pi.payload.reasoning.effort, after.provider.reasoning)
      assert.equal(call.response.pi.result.model, after.model.name)
      if (call.response.done) {
        const counted =
          after.provider.outputLimit === 'non-reasoning-tokens-checked-after-response'
            ? nonReasoningTokens(call.response.pi.result.usage)
            : call.response.pi.result.usage.output
        assert.ok(counted <= call.request.options.num_predict)
      }
      outputTokens += call.response.pi.result.usage.output
      reasoningTokens += call.response.pi.result.usage.reasoning ?? 0
    }
  }
  if (axis === 'assessment') {
    assert.equal(current.assessmentReplacements, replacements)
  }
  measurements.push({
    actual: item.actual,
    before: previous.actual,
    beforeCorrect: previous.correct,
    correct: item.correct,
    id: item.id,
    mode: item.mode,
    outputTokens,
    reasoningTokens,
    requests: current.trace.length,
  })
}
const report = {
  axis,
  baselineAssessment: before.assessment,
  baselineModel: before.model.name,
  baselinePassed: baselineSummary.results.filter((item) => item.correct).length,
  candidateAssessment: after.assessment,
  candidateModel: after.model.name,
  candidatePassed: summary.results.filter((item) => item.correct).length,
  errors: summary.results.filter((item) => item.error !== undefined).length,
  measurements,
  provider: after.provider,
  sameInitialPromptsAndSchemas: true,
  samePointsCasesAndPromptVersion: true,
  searchBoundsVerified: true,
  total: measurements.length,
}
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, {flag: 'wx'})
console.log(JSON.stringify(report))
