/* oxlint-disable eslint/no-await-in-loop -- Run local model evaluations sequentially. */
import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {mkdir, mkdtemp, readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import {createJiti} from 'jiti'
const jiti = createJiti(import.meta.url)
const EXPECTED_VERSION = 7
const {assertArtifactAbsent, writeArtifact} = await jiti.import(
  '../../../../../src/cli/artifacts.ts',
)
const execute = promisify(execFile)
const cli = fileURLToPath(new URL('../../../../../bin/know.mjs', import.meta.url))
const root = new URL('../../../', import.meta.url)
const available = [
  {
    baseline: 'expanded/runs/prompt-3/01/report.json',
    golden: 'expanded/golden.json',
    name: 'expanded',
    repository: '/private/tmp/knowledge-expanded-v5.ekddrU',
  },
  {
    baseline: 'runs/prompt-3/report.json',
    golden: 'golden.json',
    name: 'original',
    repository: '/private/tmp/knowledge-original-v5.Fc7Yru',
  },
  {
    baseline: 'workplace/baseline.json',
    golden: 'workplace/golden.json',
    name: 'workplace',
    repository: '/private/tmp/knowledge-workplace.GHDWKr',
  },
]
const selected = process.argv.slice(2)
assert.ok(selected.every((name) => available.some((entry) => entry.name === name)))
const definitions = available.filter(
  (entry) => selected.length === 0 || selected.includes(entry.name),
)
for (const definition of definitions) {
  const directory = new URL(`${definition.name}/`, import.meta.url)
  await mkdir(directory, {recursive: true})
  for (const name of ['diagnostic.json', 'warm.json', 'report.json', 'execution.json']) {
    await assertArtifactAbsent(fileURLToPath(new URL(name, directory)))
  }
}
for (const definition of definitions) {
  const directory = new URL(`${definition.name}/`, import.meta.url)
  const path = (name) => fileURLToPath(new URL(name, directory))
  const cacheDirectory = await mkdtemp(join(tmpdir(), 'knowledge-cli-v7-'))
  const startedAt = new Date().toISOString()
  const baseline = JSON.parse(await readFile(new URL(definition.baseline, root), 'utf8'))
  const arguments_ = [
    'doctor',
    definition.repository,
    '--model',
    'gemma4:latest',
    '--inspection-mode',
    'separated',
    '--limit',
    String(baseline.diagnostic.semantic.limit),
    '--cache-dir',
    cacheDirectory,
    '--json',
  ]
  console.log('Starting', definition.name, cacheDirectory)
  const cold = await execute(process.execPath, [cli, ...arguments_], {maxBuffer: 16_777_216})
  const diagnostic = JSON.parse(cold.stdout)
  await writeArtifact({path: path('diagnostic.json'), value: diagnostic})
  assert.equal(diagnostic.healthy, true)
  assert.equal(diagnostic.semantic.status, 'complete')
  assert.equal(diagnostic.semantic.promptVersion, EXPECTED_VERSION)
  assert.equal(diagnostic.semantic.cached, 0)
  assert.deepEqual(diagnostic.semantic.errors, [])
  assert.deepEqual(diagnostic.semantic.retrieval.errors, [])
  const warm = await execute(process.execPath, [cli, ...arguments_], {maxBuffer: 16_777_216})
  const cached = JSON.parse(warm.stdout)
  await writeArtifact({path: path('warm.json'), value: cached})
  assert.equal(cached.semantic.cached, diagnostic.semantic.selectedPairs)
  assert.deepEqual(cached.semantic.assessments, diagnostic.semantic.assessments)
  assert.equal(cached.semantic.status, 'complete')
  const evaluated = await execute(
    process.execPath,
    [
      cli,
      'eval-inspection',
      fileURLToPath(new URL(definition.golden, root)),
      '--report',
      path('diagnostic.json'),
      '--baseline',
      fileURLToPath(new URL(definition.baseline, root)),
      '--output',
      path('report.json'),
      '--json',
    ],
    {maxBuffer: 16_777_216},
  )
  const report = JSON.parse(evaluated.stdout)
  await writeArtifact({
    path: path('execution.json'),
    value: {
      arguments: arguments_,
      cacheDirectory,
      coldExitCode: 0,
      evaluationExitCode: 0,
      finishedAt: new Date().toISOString(),
      startedAt,
      stderr: {cold: cold.stderr, evaluation: evaluated.stderr, warm: warm.stderr},
      summary: report.summary,
      warmExitCode: 0,
    },
  })
  console.log('Completed', definition.name, JSON.stringify(report.summary))
}
