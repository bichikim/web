import {strict as assert} from 'node:assert'
import {readFileSync, unlinkSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createPreparationFixtures} from './create-preparation-fixtures'
import {createLinkedExperiment} from './create-linked-experiment'

const [, , binary] = process.argv
if (binary === undefined) {
  throw new Error('Missing native binary')
}
const [fixture] = createPreparationFixtures()
const consumer = 'loose/configured.ts'
const text = "import {greet as configured} from '@chosen'; configured()"
writeFileSync(resolve(fixture.root, consumer), text)
const expected = text.matchAll(/greet|configured/gu)
const positions = [...expected].map((match) => JSON.stringify([consumer, 1, match.index + 1]))
const client = createLinkedExperiment({
  binary,
  documents: [],
  receive: () => undefined,
  root: fixture.root,
})
const query = async () => {
  const source = readFileSync(resolve(fixture.root, fixture.target), 'utf8')
  return (
    await client.query({
      file: fixture.target,
      kind: 'references',
      offset: source.indexOf('greet'),
      source,
    })
  )
    .map(({path, line, column}) => JSON.stringify([path, line, column]))
    .sort()
}
try {
  assert.deepEqual(await query(), fixture.expected)
  const path = resolve(fixture.root, 'loose/tsconfig.json')
  const configuration = JSON.stringify({
    compilerOptions: {paths: {'@chosen': ['../core/entry.ts']}},
    extends: '../tsconfig.json',
    include: ['*.ts'],
  })
  writeFileSync(path, configuration)
  assert.deepEqual(await query(), [...fixture.expected, ...positions].sort())
  writeFileSync(path, configuration.replace('../core/entry.ts', '../other/entry.ts'))
  assert.deepEqual(await query(), fixture.expected)
  unlinkSync(path)
  assert.deepEqual(await query(), fixture.expected)
  console.log(
    JSON.stringify({
      checks: [
        'missing-configuration',
        'configuration-created',
        'alias-retarget',
        'configuration-deleted',
      ],
      passed: true,
      resets: client.diagnostics().resets,
    }),
  )
} finally {
  await client.dispose()
}
