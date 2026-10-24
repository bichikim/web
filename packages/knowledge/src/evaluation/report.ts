import {createHash} from 'node:crypto'
import {z} from 'zod'

export interface EvaluationTarget {
  readonly docId: string
  readonly unitId?: string
}
export interface EvaluationCase {
  readonly expected: ReadonlyArray<EvaluationTarget>
  readonly id: string
  readonly query: string
}
export interface EvaluationDataset {
  readonly cases: ReadonlyArray<EvaluationCase>
  readonly version: 1
}
export interface EvaluationRanking {
  readonly hits: ReadonlyArray<EvaluationTarget>
  readonly id: string
  readonly repoId: string
  readonly workspaceId: string
}
export interface EvaluationScore {
  readonly hits: ReadonlyArray<EvaluationTarget>
  readonly id: string
  readonly recall: number
  readonly reciprocalRank: number
}
export interface EvaluationSummary {
  readonly mrr: number
  readonly recall: number
}
export interface EvaluationComparison {
  readonly mrrDelta: number
  readonly recallDelta: number
  readonly regressions: ReadonlyArray<string>
}
export interface EvaluationReport {
  readonly cases: ReadonlyArray<EvaluationScore>
  readonly comparison: EvaluationComparison | null
  readonly datasetHash: string
  readonly cutoff: number
  readonly repoId: string
  readonly summary: EvaluationSummary
  readonly version: 1
  readonly workspaceId: string
}
export interface EvaluationFailure {
  readonly error: {
    readonly code:
      | 'invalid-evaluation-dataset'
      | 'invalid-evaluation-ranking'
      | 'invalid-evaluation-baseline'
  }
  readonly ok: false
}
export interface EvaluationSuccess<T> {
  readonly ok: true
  readonly value: T
}
export type EvaluationResult<T> = EvaluationSuccess<T> | EvaluationFailure

const MAX_TEXT_LENGTH = 4096
const MAX_TARGETS = 100
const MAX_CASES = 1000
const identifier = z
  .string()
  .trim()
  .min(1)
  .max(MAX_TEXT_LENGTH)
  .regex(/^[^\s#]+$/u)
const targetSchema = z.object({docId: identifier, unitId: identifier.optional()}).strict()
const caseSchema = z
  .object({
    expected: z.array(targetSchema).min(1).max(MAX_TARGETS),
    id: identifier,
    query: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  })
  .strict()
  .refine(({expected}) =>
    expected.every(
      (target, position) =>
        !expected
          .slice(0, position)
          .some(
            (previous) =>
              previous.docId === target.docId &&
              (previous.unitId === undefined ||
                target.unitId === undefined ||
                previous.unitId === target.unitId),
          ),
    ),
  )
const datasetSchema = z
  .object({cases: z.array(caseSchema).min(1).max(MAX_CASES), version: z.literal(1)})
  .strict()
  .refine(({cases}) => new Set(cases.map(({id}) => id)).size === cases.length)
const metric = z.number().min(0).max(1)
const summarySchema = z.object({mrr: metric, recall: metric}).strict()
const cutoffSchema = z.number().int().min(1).max(MAX_TARGETS)
const scoreSchema = z
  .object({
    hits: z.array(targetSchema).max(MAX_TARGETS),
    id: identifier,
    recall: metric,
    reciprocalRank: metric,
  })
  .strict()
const reportSchema = z
  .object({
    cases: z.array(scoreSchema).min(1).max(MAX_CASES),
    comparison: z
      .object({
        mrrDelta: z.number().min(-1).max(1),
        recallDelta: z.number().min(-1).max(1),
        regressions: z.array(identifier),
      })
      .strict()
      .nullable(),
    cutoff: cutoffSchema,
    datasetHash: z.string().regex(/^[a-f0-9]{64}$/u),
    repoId: z.string().min(1),
    summary: summarySchema,
    version: z.literal(1),
    workspaceId: z.string().min(1),
  })
  .strict()

/** Validates versioned query cases, rejecting duplicate IDs and overlapping targets. */
export const parseEvaluationDataset = (input: unknown): EvaluationResult<EvaluationDataset> => {
  const parsed = datasetSchema.safeParse(input)
  return parsed.success
    ? {ok: true, value: parsed.data}
    : {error: {code: 'invalid-evaluation-dataset'}, ok: false}
}

interface ScoreCaseOptions {
  readonly entry: EvaluationCase
  readonly hits: ReadonlyArray<EvaluationTarget>
  readonly cutoff: number
}
const matches = (target: EvaluationTarget, hit: EvaluationTarget): boolean =>
  target.docId === hit.docId && (target.unitId === undefined || target.unitId === hit.unitId)
const scoreCase = (options: ScoreCaseOptions): EvaluationScore => {
  const hits = options.hits.slice(0, options.cutoff)
  const found = options.entry.expected.filter((target) =>
    hits.some((hit) => matches(target, hit)),
  ).length
  const first = hits.findIndex((hit) =>
    options.entry.expected.some((target) => matches(target, hit)),
  )
  return {
    hits,
    id: options.entry.id,
    recall: found / options.entry.expected.length,
    reciprocalRank: first < 0 ? 0 : 1 / (first + 1),
  }
}
const summarize = (cases: ReadonlyArray<EvaluationScore>): EvaluationSummary => ({
  mrr: cases.reduce((total, entry) => total + entry.reciprocalRank, 0) / cases.length,
  recall: cases.reduce((total, entry) => total + entry.recall, 0) / cases.length,
})

interface CompareBaselineOptions {
  readonly baseline: unknown
  readonly dataset: EvaluationDataset
  readonly report: EvaluationReport
}
const compareBaseline = (options: CompareBaselineOptions): EvaluationResult<EvaluationReport> => {
  const parsed = reportSchema.safeParse(options.baseline)
  const failure = {error: {code: 'invalid-evaluation-baseline'}, ok: false} as const
  if (!parsed.success) {
    return failure
  }
  const baseline = parsed.data
  const {report, dataset} = options
  if (
    baseline.datasetHash !== report.datasetHash ||
    baseline.cutoff !== report.cutoff ||
    baseline.repoId !== report.repoId ||
    baseline.workspaceId !== report.workspaceId ||
    baseline.cases.length !== dataset.cases.length
  ) {
    return failure
  }
  const valid = baseline.cases.every((entry, position) => {
    const recomputed = scoreCase({
      cutoff: report.cutoff,
      entry: dataset.cases[position],
      hits: entry.hits,
    })
    return (
      entry.id === recomputed.id &&
      entry.hits.length <= report.cutoff &&
      entry.recall === recomputed.recall &&
      entry.reciprocalRank === recomputed.reciprocalRank
    )
  })
  const summary = summarize(baseline.cases)
  if (
    !valid ||
    summary.mrr !== baseline.summary.mrr ||
    summary.recall !== baseline.summary.recall
  ) {
    return failure
  }
  const regressions = report.cases
    .filter(
      (entry, position) =>
        entry.recall < baseline.cases[position].recall ||
        entry.reciprocalRank < baseline.cases[position].reciprocalRank,
    )
    .map(({id}) => id)
  return {
    ok: true,
    value: {
      ...report,
      comparison: {
        mrrDelta: report.summary.mrr - summary.mrr,
        recallDelta: report.summary.recall - summary.recall,
        regressions,
      },
    },
  }
}

export interface CreateEvaluationReportOptions {
  readonly baseline?: unknown
  readonly dataset: unknown
  readonly cutoff: number
  readonly rankings: ReadonlyArray<EvaluationRanking>
}
/** Scores top-K rankings and compares compatible baselines; failures never return a partial report. */
export const createEvaluationReport = (
  options: CreateEvaluationReportOptions,
): EvaluationResult<EvaluationReport> => {
  const parsed = parseEvaluationDataset(options.dataset)
  if (!parsed.ok) {
    return parsed
  }
  const dataset = parsed.value
  const [first] = options.rankings
  if (
    !cutoffSchema.safeParse(options.cutoff).success ||
    first === undefined ||
    dataset.cases.length !== options.rankings.length ||
    options.rankings.some(
      (ranking, position) =>
        ranking.id !== dataset.cases[position].id ||
        ranking.repoId !== first.repoId ||
        ranking.workspaceId !== first.workspaceId,
    )
  ) {
    return {error: {code: 'invalid-evaluation-ranking'}, ok: false}
  }
  const cases = dataset.cases.map((entry, position) =>
    scoreCase({cutoff: options.cutoff, entry, hits: options.rankings[position].hits}),
  )
  const report: EvaluationReport = {
    cases,
    comparison: null,
    cutoff: options.cutoff,
    datasetHash: createHash('sha256').update(JSON.stringify(dataset)).digest('hex'),
    repoId: first.repoId,
    summary: summarize(cases),
    version: 1,
    workspaceId: first.workspaceId,
  }
  return options.baseline === undefined
    ? {ok: true, value: report}
    : compareBaseline({baseline: options.baseline, dataset, report})
}
