import {strict as assert} from 'node:assert'
import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createPreparationFixtures} from './create-preparation-fixtures'
import {createLinkedExperiment} from './create-linked-experiment'

const [fixture] = createPreparationFixtures()
const [, , binary] = process.argv
if (binary === undefined) {
  throw new Error('Missing native binary')
}
const client = createLinkedExperiment({
  binary,
  documents: [],
  receive: () => undefined,
  root: fixture.root,
})
const query = async (): Promise<readonly string[]> => {
  const source = readFileSync(resolve(fixture.root, fixture.target), 'utf8')
  const locations = await client.query({
    file: fixture.target,
    kind: 'references',
    offset: source.indexOf(fixture.needle),
    source,
  })
  return locations.map(({path, line, column}) => JSON.stringify([path, line, column])).sort()
}
try {
  assert.deepEqual(await query(), fixture.expected)
  assert.deepEqual(await query(), fixture.expected)
  assert.equal(client.diagnostics().resets, 0)
  const path = resolve(fixture.root, 'apps/covered.ts')
  const original = readFileSync(path, 'utf8')
  writeFileSync(path, `${original}; parent()`)
  const edited = await query()
  const APPEND_OFFSET = 3
  assert.equal(edited.length, fixture.expected.length + 1)
  assert(edited.includes(JSON.stringify(['apps/covered.ts', 1, original.length + APPEND_OFFSET])))
  assert.equal(client.diagnostics().resets, 1)
  writeFileSync(path, original)
  assert.deepEqual(await query(), fixture.expected)
  const configuration = resolve(fixture.root, 'tsconfig.json')
  const initial = readFileSync(configuration, 'utf8')
  writeFileSync(configuration, initial.replace('apps/covered.ts', 'missing.ts'))
  const uncovered = await query()
  assert.deepEqual(
    uncovered,
    fixture.expected.filter((position) => position.includes('loose/consumer.ts')),
  )
  writeFileSync(configuration, initial)
  assert.deepEqual(await query(), fixture.expected)
  console.log(
    JSON.stringify({
      checks: [
        'cold',
        'repeat',
        'closed-covered-edit',
        'source-restore',
        'coverage-removal',
        'coverage-restore',
      ],
      passed: true,
      resets: client.diagnostics().resets,
    }),
  )
} finally {
  await client.dispose()
}
