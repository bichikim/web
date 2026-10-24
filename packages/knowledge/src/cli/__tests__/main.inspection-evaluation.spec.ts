import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {readArtifact} from '../artifacts'
import {runKnowledgeCli} from '../main'
import {evaluateInspectionArtifact} from '../inspection-evaluation'
import dataset from '../../../evaluation/inspection/draft.json'
import diagnostic from '../../../evaluation/inspection/diagnostic.json'
let datasetPath: string
let reportPath: string
let temporary: string
beforeEach(async () => {
  temporary = await mkdtemp(join(tmpdir(), 'inspection-evaluation-test-'))
  datasetPath = join(temporary, 'draft.json')
  reportPath = join(temporary, 'diagnostic.json')
  await writeFile(datasetPath, JSON.stringify(dataset))
  await writeFile(reportPath, JSON.stringify(diagnostic))
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  vi.spyOn(process.stderr, 'write').mockReturnValue(true)
})
afterEach(async () => {
  vi.restoreAllMocks()
  await rm(temporary, {force: true, recursive: true})
})
it('should run the recorded CLI evaluation offline and preserve provisional status', async () => {
  expect(
    await runKnowledgeCli(['eval-inspection', datasetPath, '--report', reportPath, '--json']),
  ).toBe(0)
  const report = JSON.parse(String(vi.mocked(process.stdout.write).mock.calls[0][0]))
  expect(report).toMatchObject({cases: expect.any(Array), provisional: true})
  expect(report.cases).toHaveLength(4)
})
it('should display approved and excluded counts for a partial review', async () => {
  await writeFile(
    datasetPath,
    JSON.stringify({
      ...dataset,
      cases: dataset.cases.map(({expected, ...entry}, index) => ({
        ...entry,
        proposal: expected,
        review:
          index === 0
            ? {
                accepted: [expected, 'uncertain'],
                note: 'Both readings accepted.',
                reviewedAt: '2026-09-07T00:00:00Z',
                reviewer: 'user',
                status: 'approved',
              }
            : {status: 'unreviewed'},
      })),
      kind: 'reviewed',
      version: 2,
    }),
  )
  expect(await runKnowledgeCli(['eval-inspection', datasetPath, '--report', reportPath])).toBe(0)
  expect(process.stdout.write).toHaveBeenCalledWith(
    expect.stringContaining('REVIEWED inspection evaluation\nApproved cases=1 Excluded cases=3'),
  )
})
it('should publish a baseline, compare it and refuse to overwrite it', async () => {
  const output = join(temporary, 'baseline.json')
  const args = ['eval-inspection', datasetPath, '--report', reportPath]
  expect(await runKnowledgeCli([...args, '--output', output])).toBe(0)
  expect(await readArtifact(output)).toMatchObject({provisional: true})
  expect(await runKnowledgeCli([...args, '--baseline', output])).toBe(0)
  expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Regressions: none'))
  expect(await runKnowledgeCli([...args, '--output', output])).toBe(1)
  expect(process.stderr.write).toHaveBeenCalledWith(
    expect.stringContaining('evaluation-output-exists'),
  )
})
it('should return exit one for a measured regression or incomplete diagnostic input', async () => {
  const baseline = await evaluateInspectionArtifact({datasetPath, reportPath})
  const baselinePath = join(temporary, 'baseline.json')
  const changedPath = join(temporary, 'changed.json')
  await writeFile(baselinePath, JSON.stringify(baseline))
  const changed = {
    ...baseline.diagnostic,
    semantic: {...baseline.diagnostic.semantic, assessments: [], selectedPairs: 0},
  }
  await writeFile(changedPath, JSON.stringify(changed))
  expect(
    await runKnowledgeCli([
      'eval-inspection',
      datasetPath,
      '--report',
      changedPath,
      '--baseline',
      baselinePath,
    ]),
  ).toBe(1)
  expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('same-concurrency'))
  await writeFile(changedPath, '{}')
  expect(await runKnowledgeCli(['eval-inspection', datasetPath, '--report', changedPath])).toBe(1)
  expect(process.stderr.write).toHaveBeenCalledWith(
    expect.stringContaining('invalid-inspection-diagnostic'),
  )
})
