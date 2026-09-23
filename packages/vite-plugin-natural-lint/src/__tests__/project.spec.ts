import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, expect, it} from 'vitest'
import {resolveOptions} from '../config'
import {NaturalLintCore} from '../core'
import {analyzeProject} from '../project'
import type {DecisionProviderFactory, NaturalLintRule} from '../types'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

it('should report abstentions separately from false negatives', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-project-'))
  temporaryPaths.push(root)
  await Promise.all(
    [
      ['expected-fail-abstain.ts', 'uncertain'],
      ['expected-fail-fail.ts', 'fail'],
      ['expected-fail-pass.ts', 'pass'],
      ['expected-pass-abstain.ts', 'uncertain'],
      ['expected-pass-fail.ts', 'fail'],
      ['expected-uncertain-abstain.ts', 'uncertain'],
      ['expected-uncertain-fail.ts', 'fail'],
    ].map(([fileName, status]) =>
      writeFile(path.join(root, fileName), `export const status = '${status}'`),
    ),
  )
  const providerFactory: DecisionProviderFactory = {
    async create() {
      return {
        async close() {},
        async decide({state}) {
          const status =
            typeof state === 'object' &&
            state !== null &&
            !Array.isArray(state) &&
            'status' in state
              ? state.status
              : null
          const probability = status === 'fail' ? 0.9 : status === 'pass' ? 0.1 : 0.5
          return {violation: {probability, type: 'noul'}}
        },
      }
    },
    identifier: 'fixture',
    revision: '1',
  }
  const rule: NaturalLintRule = {
    expected: ({fileName}) =>
      fileName.stem.includes('expected-fail')
        ? 'fail'
        : fileName.stem.includes('expected-uncertain')
          ? 'uncertain'
          : 'pass',
    id: 'fixture-rule',
    inspect: ({sourceText}) => ({
      state: {
        status: sourceText.includes("'fail'")
          ? 'fail'
          : sourceText.includes("'pass'")
            ? 'pass'
            : 'uncertain',
      },
      status: 'unknown',
    }),
    message: 'Fixture violation.',
    questions: {violation: {instruction: 'Is this a violation?', type: 'noul'}},
    reduce: ({answers}) => {
      const answer = answers.violation
      if (answer?.type !== 'noul') {
        throw new TypeError('Fixture answer must be noul.')
      }
      return {
        probability: answer.probability,
        status:
          answer.probability >= 0.8 ? 'fail' : answer.probability <= 0.2 ? 'pass' : 'uncertain',
      }
    },
    select: () => true,
    severity: 'experiment',
  }
  const options = resolveOptions({include: ['*.ts'], rules: [rule]}, root)
  const core = new NaturalLintCore(options, providerFactory)

  const report = await analyzeProject(core, options)
  const experiment = report.experiments[0]

  expect(experiment).toMatchObject({
    abstainedExpectedFailures: 1,
    abstainedExpectedPasses: 1,
    accuracy: 2 / 7,
    decisiveRate: 4 / 7,
    falseNegatives: 1,
    falsePositives: 1,
    precision: 0.5,
    recall: 1 / 3,
  })
})
