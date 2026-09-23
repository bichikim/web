import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {glob} from 'tinyglobby'
import {NaturalLintCore} from './core'
import type {
  DecidedRuleOutcome,
  ExperimentObservation,
  FileAnalysisReport,
  ProjectAnalysisReport,
  ResolvedNaturalLintOptions,
  ResolvedNaturalLintRule,
  RuleExperimentReport,
} from './types'

const createObservation = (
  relativePath: string,
  outcome: DecidedRuleOutcome,
  rule: ResolvedNaturalLintRule,
): ExperimentObservation => {
  return {
    ...(outcome.answers === undefined ? {} : {answers: outcome.answers}),
    ...(outcome.expectedStatus === undefined
      ? {}
      : {
          expectedStatus: outcome.expectedStatus,
          matchesExpected: outcome.status === outcome.expectedStatus,
        }),
    probability: outcome.probability,
    ...(outcome.reason === undefined ? {} : {reason: outcome.reason}),
    relativePath,
    ...(outcome.state === undefined ? {} : {state: outcome.state}),
    status: outcome.status,
  }
}

const createExperimentReports = (
  reports: ReadonlyArray<FileAnalysisReport>,
  options: ResolvedNaturalLintOptions,
): ReadonlyArray<RuleExperimentReport> =>
  options.rules
    .map((rule, ruleIndex): RuleExperimentReport | undefined => {
      if (rule.severity !== 'experiment') {
        return undefined
      }
      const observations = reports.flatMap((report) => {
        const outcome = report.outcomes[ruleIndex]
        if (outcome === undefined || outcome.status === 'skip') {
          return []
        }
        const relativePath = path.relative(options.root, report.filePath).split(path.sep).join('/')
        return [createObservation(relativePath, outcome, rule)]
      })
      const decisive = observations.filter((observation) => observation.status !== 'uncertain')
      const expected = observations.filter(
        (observation) => observation.matchesExpected !== undefined,
      )
      const correct = expected.filter((observation) => observation.matchesExpected)
      const truePositives = observations.filter(
        ({expectedStatus, status}) => expectedStatus === 'fail' && status === 'fail',
      ).length
      const falsePositives = observations.filter(
        ({expectedStatus, status}) => expectedStatus === 'pass' && status === 'fail',
      ).length
      const expectedFailures = observations.filter(
        ({expectedStatus}) => expectedStatus === 'fail',
      ).length
      return {
        abstainedExpectedFailures: observations.filter(
          ({expectedStatus, status}) => expectedStatus === 'fail' && status === 'uncertain',
        ).length,
        abstainedExpectedPasses: observations.filter(
          ({expectedStatus, status}) => expectedStatus === 'pass' && status === 'uncertain',
        ).length,
        accuracy: expected.length === 0 ? undefined : correct.length / expected.length,
        decisiveRate: observations.length === 0 ? undefined : decisive.length / observations.length,
        failed: observations.filter(({status}) => status === 'fail').length,
        falseNegatives: observations.filter(
          ({expectedStatus, status}) => expectedStatus === 'fail' && status === 'pass',
        ).length,
        falsePositives,
        observations,
        passed: observations.filter(({status}) => status === 'pass').length,
        precision:
          truePositives + falsePositives === 0
            ? undefined
            : truePositives / (truePositives + falsePositives),
        recall: expectedFailures === 0 ? undefined : truePositives / expectedFailures,
        ruleId: rule.id,
        selected: observations.length,
        skipped: reports.length - observations.length,
        uncertain: observations.filter(({status}) => status === 'uncertain').length,
      }
    })
    .filter((report): report is RuleExperimentReport => report !== undefined)

export const analyzeProject = async (
  core: NaturalLintCore,
  options: ResolvedNaturalLintOptions,
): Promise<ProjectAnalysisReport> => {
  const files = await glob(options.include, {
    absolute: true,
    cwd: options.root,
    ignore: options.exclude,
    onlyFiles: true,
  })
  const reports: ReadonlyArray<FileAnalysisReport> = await Promise.all(
    files
      .map((file) => path.resolve(file))
      .sort()
      .map(async (filePath) => core.analyzeFile(filePath, await readFile(filePath, 'utf8'))),
  )
  return {
    cacheHits: reports.reduce((total, report) => total + report.cacheHits, 0),
    diagnostics: reports.flatMap((report) => report.diagnostics),
    experiments: createExperimentReports(reports, options),
    filesScanned: reports.length,
    layaCalls: reports.reduce((total, report) => total + report.layaCalls, 0),
    outcomes: reports.flatMap((report) => report.outcomes),
  }
}
