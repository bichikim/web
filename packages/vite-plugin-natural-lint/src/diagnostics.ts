import type {NaturalLintDiagnostic, ProjectAnalysisReport} from './types'

const PERCENT_MULTIPLIER = 100
const PROBABILITY_PRECISION = 4

const formatRate = (rate: number | undefined): string =>
  rate === undefined ? 'n/a' : `${(rate * PERCENT_MULTIPLIER).toFixed(1)}%`

const formatExperiment = (experiment: ProjectAnalysisReport['experiments'][number]): string => {
  const expected = experiment.observations.filter(
    (observation) => observation.matchesExpected !== undefined,
  )
  const correct = expected.filter((observation) => observation.matchesExpected).length
  const summary = [
    `Experiment ${experiment.ruleId}: selected ${experiment.selected}, skipped ${experiment.skipped};`,
    `fail ${experiment.failed}, pass ${experiment.passed}, uncertain ${experiment.uncertain};`,
    `coverage ${formatRate(experiment.decisiveRate)}.`,
    `accuracy ${formatRate(experiment.accuracy)} (${correct}/${expected.length}).`,
    `precision ${formatRate(experiment.precision)}, recall ${formatRate(experiment.recall)}.`,
    `false positives ${experiment.falsePositives}, false negatives ${experiment.falseNegatives};`,
    `abstained expected pass ${experiment.abstainedExpectedPasses},`,
    `expected fail ${experiment.abstainedExpectedFailures}.`,
  ].join(' ')
  const observations = experiment.observations.map((observation) => {
    return [
      `  ${observation.relativePath}  ${observation.status}`,
      `probability=${observation.probability.toFixed(PROBABILITY_PRECISION)}`,
      ...(observation.reason === undefined ? [] : [`reason=${observation.reason}`]),
      ...(observation.expectedStatus === undefined
        ? []
        : [
            `expected=${observation.expectedStatus}`,
            `correct=${observation.matchesExpected ? 'yes' : 'no'}`,
          ]),
    ].join('  ')
  })
  return [summary, ...observations].join('\n')
}

export const formatExperimentReports = (
  experiments: ProjectAnalysisReport['experiments'],
): string => experiments.map(formatExperiment).join('\n')

const compareDiagnostics = (left: NaturalLintDiagnostic, right: NaturalLintDiagnostic): number =>
  left.relativePath.localeCompare(right.relativePath) || left.ruleId.localeCompare(right.ruleId)

export const formatDiagnostic = (diagnostic: NaturalLintDiagnostic): string =>
  `${diagnostic.relativePath}:1:1  ${diagnostic.ruleId}  ${diagnostic.message}`

export const formatProjectReport = (report: ProjectAnalysisReport): string => {
  const diagnostics = [...report.diagnostics].sort(compareDiagnostics).map(formatDiagnostic)
  const summary = [
    `Scanned ${report.filesScanned} files;`,
    `${report.cacheHits} cached results,`,
    `${report.layaCalls} Laya calls,`,
    `${report.diagnostics.length} diagnostics.`,
  ].join(' ')
  const experimentReport = formatExperimentReports(report.experiments)
  return [
    ...diagnostics,
    ...(experimentReport.length === 0 ? [] : [experimentReport]),
    summary,
  ].join('\n')
}
