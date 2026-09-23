import {expect, it} from 'vitest'
import {formatProjectReport} from '../diagnostics'
import type {ProjectAnalysisReport} from '../types'

it('should summarize experiment results and list every selected file', () => {
  const report: ProjectAnalysisReport = {
    cacheHits: 0,
    diagnostics: [],
    experiments: [
      {
        abstainedExpectedFailures: 0,
        abstainedExpectedPasses: 1,
        accuracy: 0.5,
        decisiveRate: 0.5,
        failed: 1,
        falseNegatives: 0,
        falsePositives: 0,
        observations: [
          {
            expectedStatus: 'fail',
            matchesExpected: true,
            probability: 0.91,
            relativePath: 'src/long-name.ts',
            status: 'fail',
          },
          {
            expectedStatus: 'pass',
            matchesExpected: false,
            probability: 0.3667,
            relativePath: 'src/mixed-name.ts',
            status: 'uncertain',
          },
        ],
        passed: 0,
        precision: 1,
        recall: 1,
        ruleId: 'filename',
        selected: 2,
        skipped: 1,
        uncertain: 1,
      },
    ],
    filesScanned: 3,
    modelCalls: 6,
    outcomes: [],
  }

  const output = formatProjectReport(report)

  expect(output).toContain('Experiment filename: selected 2, skipped 1')
  expect(output).toContain('coverage 50.0%')
  expect(output).toContain('accuracy 50.0% (1/2)')
  expect(output).toContain('precision 100.0%, recall 100.0%')
  expect(output).toContain('false positives 0, false negatives 0')
  expect(output).toContain('abstained expected pass 1, expected fail 0')
  expect(output).toContain('src/long-name.ts  fail  probability=0.9100')
  expect(output).toContain('expected=fail  correct=yes')
  expect(output).toContain('src/mixed-name.ts  uncertain  probability=0.3667')
})
