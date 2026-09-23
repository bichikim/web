import {createReviewCaseKey, type ReviewRecord} from './review'

const MINIMUM_CONFIRMED = 50
const MINIMUM_HOLDOUT = 20
const MINIMUM_LABEL_SHARE = 0.3
const PERCENT_SCALE = 100

export interface EvaluationMetrics {
  readonly acceptedModelLabels: number
  readonly abstained: number
  readonly accuracy: number | undefined
  readonly confirmed: number
  readonly correctUncertain: number
  readonly evaluated: number
  readonly failLabels: number
  readonly falseNegatives: number
  readonly falsePositives: number
  readonly passLabels: number
  readonly precision: number | undefined
  readonly recall: number | undefined
  readonly reviewed: number
  readonly skipped: number
  readonly uncertainLabels: number
}

export interface EvaluationGroup extends EvaluationMetrics {
  readonly falseNegativePaths: ReadonlyArray<string>
  readonly falsePositivePaths: ReadonlyArray<string>
  readonly providerIdentifier: string
  readonly providerRevision: string
  readonly ruleFingerprint: string
  readonly ruleId: string
}

export interface EvaluationReadiness {
  readonly balancedLabels: boolean
  readonly enoughConfirmed: boolean
  readonly enoughHoldout: boolean
  readonly holdout: number
  readonly ready: boolean
}

export interface EvaluationReport {
  readonly groups: ReadonlyArray<EvaluationGroup>
  readonly readiness: EvaluationReadiness
  readonly totals: EvaluationMetrics
}

interface CountedRecords {
  readonly falseNegatives: ReadonlyArray<ReviewRecord>
  readonly falsePositives: ReadonlyArray<ReviewRecord>
  readonly records: ReadonlyArray<ReviewRecord>
}

const divide = (numerator: number, denominator: number): number | undefined =>
  denominator === 0 ? undefined : numerator / denominator

const calculateMetrics = ({
  falseNegatives,
  falsePositives,
  records,
}: CountedRecords): EvaluationMetrics => {
  const humanRecords = records.filter(({labelSource}) => labelSource !== 'accepted-model')
  const evaluated = humanRecords.filter(({label}) => label !== 'skip')
  const confirmed = humanRecords.filter(({label}) => label === 'fail' || label === 'pass')
  const truePositives = confirmed.filter(
    ({label, observedStatus}) => label === 'fail' && observedStatus === 'fail',
  ).length
  const trueNegatives = confirmed.filter(
    ({label, observedStatus}) => label === 'pass' && observedStatus === 'pass',
  ).length
  const failLabels = confirmed.filter(({label}) => label === 'fail').length
  const passLabels = confirmed.length - failLabels
  const correctUncertain = evaluated.filter(
    ({label, observedStatus}) => label === 'uncertain' && observedStatus === 'uncertain',
  ).length
  const exactMatches = evaluated.filter(
    ({label, observedStatus}) => label === observedStatus,
  ).length
  return {
    abstained: confirmed.filter(({observedStatus}) => observedStatus === 'uncertain').length,
    acceptedModelLabels: records.filter(({labelSource}) => labelSource === 'accepted-model').length,
    accuracy: divide(exactMatches, evaluated.length),
    confirmed: confirmed.length,
    correctUncertain,
    evaluated: evaluated.length,
    failLabels,
    falseNegatives: falseNegatives.length,
    falsePositives: falsePositives.length,
    passLabels,
    precision: divide(truePositives, truePositives + falsePositives.length),
    recall: divide(truePositives, failLabels),
    reviewed: records.length,
    skipped: records.filter(({label}) => label === 'skip').length,
    uncertainLabels: records.filter(({label}) => label === 'uncertain').length,
  }
}

const countRecords = (records: ReadonlyArray<ReviewRecord>): CountedRecords => ({
  falseNegatives: records.filter(
    ({label, labelSource, observedStatus}) =>
      labelSource !== 'accepted-model' && label === 'fail' && observedStatus === 'pass',
  ),
  falsePositives: records.filter(
    ({label, labelSource, observedStatus}) =>
      labelSource !== 'accepted-model' && label === 'pass' && observedStatus === 'fail',
  ),
  records,
})

const groupKey = (record: ReviewRecord): string =>
  JSON.stringify([
    record.ruleId,
    record.ruleFingerprint,
    record.providerIdentifier,
    record.providerRevision,
  ])

const createGroup = (records: ReadonlyArray<ReviewRecord>): EvaluationGroup => {
  const [first] = records
  if (first === undefined) {
    throw new TypeError('An evaluation group must contain at least one review record.')
  }
  const counted = countRecords(records)
  return {
    ...calculateMetrics(counted),
    falseNegativePaths: counted.falseNegatives.map(({relativePath}) => relativePath),
    falsePositivePaths: counted.falsePositives.map(({relativePath}) => relativePath),
    providerIdentifier: first.providerIdentifier,
    providerRevision: first.providerRevision,
    ruleFingerprint: first.ruleFingerprint,
    ruleId: first.ruleId,
  }
}

export const evaluateReviews = (records: ReadonlyArray<ReviewRecord>): EvaluationReport => {
  const grouped = Map.groupBy(records, groupKey)
  const totals = calculateMetrics(countRecords(records))
  const confirmedCases = [
    ...Map.groupBy(
      records.filter(
        ({label, labelSource}) =>
          labelSource !== 'accepted-model' && (label === 'fail' || label === 'pass'),
      ),
      createReviewCaseKey,
    ).values(),
  ].flatMap((matches) => {
    const labels = new Set(matches.map(({label}) => label))
    const [representative] = matches
    if (representative === undefined || labels.size !== 1) {
      return []
    }
    return [
      {
        ...representative,
        split: matches.some(({split}) => split === 'holdout')
          ? ('holdout' as const)
          : representative.split,
      },
    ]
  })
  const holdout = confirmedCases.filter(({split}) => split === 'holdout').length
  const failLabels = confirmedCases.filter(({label}) => label === 'fail').length
  const passLabels = confirmedCases.length - failLabels
  const failShare = divide(failLabels, confirmedCases.length) ?? 0
  const passShare = divide(passLabels, confirmedCases.length) ?? 0
  const balancedLabels = failShare >= MINIMUM_LABEL_SHARE && passShare >= MINIMUM_LABEL_SHARE
  const enoughConfirmed = confirmedCases.length >= MINIMUM_CONFIRMED
  const enoughHoldout = holdout >= MINIMUM_HOLDOUT
  return {
    groups: [...grouped.values()].map(createGroup),
    readiness: {
      balancedLabels,
      enoughConfirmed,
      enoughHoldout,
      holdout,
      ready: balancedLabels && enoughConfirmed && enoughHoldout,
    },
    totals,
  }
}

const percentage = (value: number | undefined): string =>
  value === undefined ? 'n/a' : `${(value * PERCENT_SCALE).toFixed(1)}%`

const formatGroup = (group: EvaluationGroup): ReadonlyArray<string> => {
  const scores = [
    `evaluated=${group.evaluated}`,
    `confirmed=${group.confirmed}`,
    `accuracy=${percentage(group.accuracy)}`,
    `precision=${percentage(group.precision)}`,
    `recall=${percentage(group.recall)}`,
    `abstained=${group.abstained}`,
    `correct-uncertain=${group.correctUncertain}`,
  ].join(' ')
  return [
    `${group.ruleId} · ${group.providerIdentifier}@${group.providerRevision}`,
    `  ${scores}`,
    ...group.falsePositivePaths.map((filePath) => `  false-positive ${filePath}`),
    ...group.falseNegativePaths.map((filePath) => `  false-negative ${filePath}`),
  ]
}

export const formatEvaluationReport = (report: EvaluationReport): string => {
  const lines = report.groups.flatMap(formatGroup)
  const {readiness, totals} = report
  const totalsLine = [
    `reviewed=${totals.reviewed}`,
    `evaluated=${totals.evaluated}`,
    `confirmed=${totals.confirmed}`,
    `accepted-model=${totals.acceptedModelLabels}`,
    `pass=${totals.passLabels}`,
    `fail=${totals.failLabels}`,
    `uncertain=${totals.uncertainLabels}`,
    `skip=${totals.skipped}`,
  ].join(' ')
  const readinessLine = [
    `confirmed>=${MINIMUM_CONFIRMED}: ${readiness.enoughConfirmed}`,
    `balanced>=${MINIMUM_LABEL_SHARE * PERCENT_SCALE}%: ${readiness.balancedLabels}`,
    `holdout>=${MINIMUM_HOLDOUT}: ${readiness.enoughHoldout}`,
  ].join(', ')
  return [
    ...lines,
    `Total: ${totalsLine}`,
    `Training readiness: ${readiness.ready ? 'ready' : 'not ready'} (${readinessLine})`,
  ].join('\n')
}
