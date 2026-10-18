import {z} from 'zod'
import type {NativeLocation, NativeQuery} from './types'
import {strict as assert} from 'node:assert'
import {mkdirSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createLinkingFixtures} from './create-linking-fixtures'
import {createLinkedExperiment} from './create-linked-experiment'
const [fixture] = createLinkingFixtures()
const {root} = fixture
const MODULE_USAGE_COUNT = 3
const CONSUMER_COUNT = 2
const INITIAL_USAGE_COUNT = fixture.expected.length + MODULE_USAGE_COUNT * CONSUMER_COUNT
const closed = "import {greet as closed} from '../packages/core/src/entry'; closed()"
writeFileSync(resolve(root, 'apps/closed.ts'), closed)
writeFileSync(resolve(root, 'packages/core/src/other-classes.ts'), 'export class A { run() {} }')
const configurationFile = resolve(root, 'tsconfig.json')
const configuration = z
  .object({compilerOptions: z.record(z.string(), z.unknown())})
  .passthrough()
  .parse(JSON.parse(readFileSync(configurationFile, 'utf8')))
const initialConfiguration = {
  ...configuration,
  compilerOptions: {
    ...configuration.compilerOptions,
    paths: {'@chosen': ['./packages/core/src/entry.ts']},
  },
}
writeFileSync(configurationFile, JSON.stringify(initialConfiguration))
writeFileSync(
  resolve(root, 'apps/configured.ts'),
  "import {greet as configured} from '@chosen'; configured()",
)
const client = createLinkedExperiment({
  binary:
    process.argv[2] ??
    (() => {
      throw new Error('Missing native binary')
    })(),
  documents: [],
  receive: () => undefined,
  root,
})
const key = (location: NativeLocation): string =>
  JSON.stringify([location.path, location.line, location.column])
const query = async (
  file: string,
  needle: string,
  kind: NativeQuery['kind'] = 'references',
): Promise<Set<string>> => {
  const source = readFileSync(resolve(root, file), 'utf8')
  const locations = await client.query({file, kind, offset: source.indexOf(needle), source})
  return new Set(locations.map(key))
}
try {
  const first = await query(fixture.target, 'greet')
  assert.equal(first.size, INITIAL_USAGE_COUNT)
  const repeat = await query(fixture.target, 'greet')
  assert.deepEqual(repeat, first)
  assert.equal(client.diagnostics().resets, 0)
  writeFileSync(
    configurationFile,
    JSON.stringify({
      ...configuration,
      compilerOptions: {...configuration.compilerOptions, paths: {'@chosen': ['./other/entry.ts']}},
    }),
  )
  const rerouted = await query(fixture.target, 'greet')
  assert.equal(rerouted.size, INITIAL_USAGE_COUNT - MODULE_USAGE_COUNT)
  assert.ok([...rerouted].every((position) => !position.includes('apps/configured.ts')))
  const other = await query('other/entry.ts', 'greet')
  assert.equal(other.size, MODULE_USAGE_COUNT * CONSUMER_COUNT)
  writeFileSync(configurationFile, JSON.stringify(initialConfiguration))
  assert.deepEqual(await query(fixture.target, 'greet'), first)
  writeFileSync(resolve(root, 'apps/closed.ts'), `${closed}\nclosed()`)
  const edited = await query(fixture.target, 'greet')
  assert.equal(edited.size, INITIAL_USAGE_COUNT + 1)
  assert.ok(edited.has(JSON.stringify(['apps/closed.ts', closed.split('\n').length + 1, 1])))
  mkdirSync(resolve(root, 'outside'))
  writeFileSync(
    resolve(root, 'outside/new.ts'),
    "import {greet as outside} from '../packages/core/src/entry'; outside()",
  )
  const added = await query(fixture.target, 'greet')
  assert.equal(added.size, INITIAL_USAGE_COUNT + 1 + MODULE_USAGE_COUNT)
  const old = await query('packages/core/src/classes.ts', 'run()')
  assert.equal(old.size, 1)
  const map = resolve(root, 'packages/core/dist/classes.d.ts.map')
  const value = z
    .object({sources: z.array(z.string())})
    .passthrough()
    .parse(JSON.parse(readFileSync(map, 'utf8')))
  writeFileSync(map, JSON.stringify({...value, sources: ['../src/other-classes.ts']}))
  const detached = await query('packages/core/src/classes.ts', 'run()')
  assert.equal(detached.size, 0)
  const retargeted = await query('packages/core/src/other-classes.ts', 'run()')
  assert.equal(retargeted.size, 1)
  const definition = await query('apps/classes.ts', 'run()', 'definition')
  assert.deepEqual(
    [...definition],
    [JSON.stringify(['packages/core/src/other-classes.ts', 1, 'export class A { '.length + 1])],
  )
  unlinkSync(resolve(root, 'outside/new.ts'))
  const removed = await query(fixture.target, 'greet')
  assert.equal(removed.size, INITIAL_USAGE_COUNT + 1)
  await assert.rejects(
    () => client.query({file: fixture.target, kind: 'references', offset: 0, source: 'old'}),
    /stale-source/u,
  )
  console.log(
    JSON.stringify({
      checks: [
        'retained-identities',
        'compiler-paths-retarget',
        'closed-consumer-edit',
        'new-file',
        'declaration-map-retarget',
        'definition-retarget',
        'deleted-file',
        'stale-source',
      ],
      passed: true,
      resets: client.diagnostics().resets,
    }),
  )
} finally {
  await client.dispose()
}
