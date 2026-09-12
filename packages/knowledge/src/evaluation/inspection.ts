import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {z} from 'zod'
import type {Assessment, InspectionModel} from '../inspection/index'

export interface InspectionEvaluationTarget {
  readonly docId: string
  readonly unitId: string
  readonly contentHash: string
}
export interface InspectionLabel {
  readonly id: string
  readonly left: InspectionEvaluationTarget
  readonly right: InspectionEvaluationTarget
  readonly expected: Assessment['kind']
}
interface DatasetBase {
  readonly version: 1
  readonly repoId: string
  readonly workspaceId: string
  readonly cases: ReadonlyArray<InspectionLabel>
}
export interface DraftInspectionDataset extends DatasetBase {
  readonly kind: 'draft'
}
export interface GoldenInspectionDataset extends DatasetBase {
  readonly kind: 'golden'
  readonly review: {readonly reviewer: string; readonly reviewedAt: string}
}
export interface ApprovedInspectionReview {
  readonly status: 'approved'
  readonly accepted: ReadonlyArray<Assessment['kind']>
  readonly note: string
  readonly reviewer: string
  readonly reviewedAt: string
}
export interface TentativeInspectionReview {
  readonly status: 'tentative'
  readonly note: string
}
export interface CommentedInspectionReview {
  readonly status: 'commented'
  readonly note: string
}
export interface UnreviewedInspectionReview {
  readonly status: 'unreviewed'
}
export type InspectionReview =
  | ApprovedInspectionReview
  | TentativeInspectionReview
  | CommentedInspectionReview
  | UnreviewedInspectionReview
export interface ReviewedInspectionLabel {
  readonly id: string
  readonly left: InspectionEvaluationTarget
  readonly right: InspectionEvaluationTarget
  readonly proposal: Assessment['kind']
  readonly review: InspectionReview
}
export interface ReviewedInspectionDataset {
  readonly kind: 'reviewed'
  readonly version: 2
  readonly repoId: string
  readonly workspaceId: string
  readonly cases: ReadonlyArray<ReviewedInspectionLabel>
}
export type InspectionDataset =
  | DraftInspectionDataset
  | GoldenInspectionDataset
  | ReviewedInspectionDataset
export interface EvaluatedAssessment {
  readonly left: InspectionEvaluationTarget
  readonly right: InspectionEvaluationTarget
  readonly assessment: {readonly kind: Assessment['kind']}
}
export interface InspectionObservation {
  readonly assessments: ReadonlyArray<EvaluatedAssessment>
  readonly errors: ReadonlyArray<unknown>
  readonly limit: number
  readonly model?: InspectionModel
  readonly promptVersion: number
  readonly repoId: string
  readonly workspaceId: string
  readonly sourceUnits: ReadonlyArray<InspectionEvaluationTarget>
  readonly selectedPairs: number
  readonly status: 'complete'
  readonly retrieval: {
    readonly candidatePairs: number
    readonly errors: ReadonlyArray<unknown>
    readonly neighborsPerUnit: number
    readonly seedLimit: number
  }
}
export interface InspectionDiagnostic {
  readonly command: 'doctor'
  readonly healthy: true
  readonly semantic: InspectionObservation
}
export interface InspectionEvaluationCase {
  readonly id: string
  readonly expected: Assessment['kind'] | ReadonlyArray<Assessment['kind']>
  readonly predicted: Assessment['kind'] | null
  readonly outcome: 'correct' | 'misclassified' | 'not-selected' | 'excluded'
  readonly reviewStatus?: InspectionReview['status']
}
export interface InspectionEvaluationSummary {
  readonly approvedCases?: number
  readonly excludedCases?: number
  readonly positivePairs: number
  readonly selectedPositivePairs: number
  readonly candidateSelectionRecall: number | null
  readonly classified: number
  readonly correct: number
  readonly classificationAccuracy: number | null
  readonly unlabelledAssessments: number
}
export interface InspectionEvaluationComparison {
  readonly regressions: ReadonlyArray<string>
  readonly candidateSelectionRecallDelta: number | null
  readonly classificationAccuracyDelta: number | null
}
export interface InspectionEvaluationReport {
  readonly version: 1 | 2
  readonly datasetHash: string
  readonly sourceHash: string
  readonly provisional: boolean
  readonly diagnostic: InspectionDiagnostic
  readonly cases: ReadonlyArray<InspectionEvaluationCase>
  readonly summary: InspectionEvaluationSummary
  readonly comparison: InspectionEvaluationComparison | null
}
export interface InspectionEvaluationFailure {
  readonly ok: false
  readonly error: {
    readonly code:
      | 'invalid-inspection-dataset'
      | 'invalid-inspection-diagnostic'
      | 'invalid-inspection-baseline'
  }
}
export interface InspectionEvaluationSuccess {
  readonly ok: true
  readonly value: InspectionEvaluationReport
}
export type InspectionEvaluationResult = InspectionEvaluationSuccess | InspectionEvaluationFailure
export interface CreateInspectionEvaluationOptions {
  readonly dataset: unknown
  readonly diagnostic: unknown
  readonly baseline?: unknown
}

const MAX_IDENTIFIER = 4096
const MAX_CASES = 1000
const MAX_PAIRS = 100
const identifier = z.string().min(1).max(MAX_IDENTIFIER)
const hashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u)
const kindSchema = z.enum(['duplicate', 'conflict', 'unrelated', 'uncertain'])
const targetSchema = z
  .object({contentHash: hashSchema, docId: identifier, unitId: identifier})
  .strict()
const labelSchema = z
  .object({expected: kindSchema, id: identifier, left: targetSchema, right: targetSchema})
  .strict()
const datasetFields = {
  cases: z.array(labelSchema).min(1).max(MAX_CASES),
  repoId: identifier,
  version: z.literal(1),
  workspaceId: identifier,
}
const legacyDatasetSchema = z.discriminatedUnion('kind', [
  z.object({...datasetFields, kind: z.literal('draft')}).strict(),
  z
    .object({
      ...datasetFields,
      kind: z.literal('golden'),
      review: z.object({reviewedAt: z.iso.datetime(), reviewer: identifier.trim().min(1)}).strict(),
    })
    .strict(),
])
const reviewNote = z.string().trim().min(1)
const acceptedSchema = z
  .array(kindSchema)
  .min(1)
  .max(kindSchema.options.length)
  .refine((kinds) => new Set(kinds).size === kinds.length)
  .transform((kinds) => kinds.toSorted())
const reviewSchema = z.discriminatedUnion('status', [
  z
    .object({
      accepted: acceptedSchema,
      note: reviewNote,
      reviewedAt: z.iso.datetime(),
      reviewer: identifier.trim().min(1),
      status: z.literal('approved'),
    })
    .strict(),
  z.object({note: reviewNote, status: z.literal('tentative')}).strict(),
  z.object({note: reviewNote, status: z.literal('commented')}).strict(),
  z.object({status: z.literal('unreviewed')}).strict(),
])
const datasetSchema = z.union([
  legacyDatasetSchema,
  z
    .object({
      cases: z
        .array(
          z
            .object({
              id: identifier,
              left: targetSchema,
              proposal: kindSchema,
              review: reviewSchema,
              right: targetSchema,
            })
            .strict(),
        )
        .min(1)
        .max(MAX_CASES),
      kind: z.literal('reviewed'),
      repoId: identifier,
      version: z.literal(2),
      workspaceId: identifier,
    })
    .strict(),
])
const diagnosticSchema = z.object({
  command: z.literal('doctor'),
  healthy: z.literal(true),
  semantic: z.object({
    assessments: z
      .array(
        z.object({
          assessment: z.object({kind: kindSchema}),
          left: targetSchema,
          right: targetSchema,
        }),
      )
      .max(MAX_PAIRS),
    errors: z.array(z.unknown()).length(0),
    limit: z.number().int().min(1).max(MAX_PAIRS),
    model: z.object({digest: z.string().regex(/^[a-f0-9]{64}$/u), name: identifier}).optional(),
    promptVersion: z.number().int().positive(),
    repoId: identifier,
    retrieval: z.object({
      candidatePairs: z.number().int().nonnegative(),
      errors: z.array(z.unknown()).length(0),
      neighborsPerUnit: z.number().int().positive(),
      seedLimit: z.number().int().positive(),
    }),
    selectedPairs: z.number().int().nonnegative(),
    sourceUnits: z.array(targetSchema),
    status: z.literal('complete'),
    workspaceId: identifier,
  }),
})
const unitKey = (target: InspectionEvaluationTarget): string =>
  JSON.stringify([target.docId, target.unitId])
const pairKey = (pair: {
  readonly left: InspectionEvaluationTarget
  readonly right: InspectionEvaluationTarget
}): string => JSON.stringify([unitKey(pair.left), unitKey(pair.right)].toSorted())
const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
const positive = (kind: Assessment['kind']): boolean => kind === 'duplicate' || kind === 'conflict'
const acceptedKinds = (
  expected: InspectionEvaluationCase['expected'],
): ReadonlyArray<Assessment['kind']> => (typeof expected === 'string' ? [expected] : expected)
const positiveCase = (entry: InspectionEvaluationCase): boolean => {
  const kinds = acceptedKinds(entry.expected)
  return kinds.length > 0 && kinds.every(positive)
}
const validLabels = (dataset: InspectionDataset): boolean =>
  new Set(dataset.cases.map(({id}) => id)).size === dataset.cases.length &&
  new Set(dataset.cases.map(pairKey)).size === dataset.cases.length &&
  dataset.cases.every((entry) => unitKey(entry.left) !== unitKey(entry.right))

const validObservation = (
  dataset: InspectionDataset,
  diagnostic: InspectionDiagnostic,
): boolean => {
  const observation = diagnostic.semantic
  const sources = new Map(
    observation.sourceUnits.map((target) => [unitKey(target), target.contentHash]),
  )
  const pairs = [...dataset.cases, ...observation.assessments]
  return (
    observation.repoId === dataset.repoId &&
    observation.workspaceId === dataset.workspaceId &&
    sources.size === observation.sourceUnits.length &&
    observation.selectedPairs === observation.assessments.length &&
    observation.selectedPairs <= observation.limit &&
    observation.retrieval.candidatePairs >= observation.selectedPairs &&
    (observation.selectedPairs === 0 || observation.model !== undefined) &&
    new Set(observation.assessments.map(pairKey)).size === observation.assessments.length &&
    pairs.every(
      (entry) =>
        unitKey(entry.left) !== unitKey(entry.right) &&
        [entry.left, entry.right].every(
          (target) => sources.get(unitKey(target)) === target.contentHash,
        ),
    )
  )
}

const scoreDiagnostic = (
  dataset: InspectionDataset,
  diagnostic: InspectionDiagnostic,
): InspectionEvaluationReport => {
  const predictions = new Map(
    diagnostic.semantic.assessments.map((entry) => [pairKey(entry), entry.assessment.kind]),
  )
  const cases = dataset.cases.map(
    (entry: InspectionLabel | ReviewedInspectionLabel): InspectionEvaluationCase => {
      const predicted = predictions.get(pairKey(entry)) ?? null
      const excluded = 'review' in entry && entry.review.status !== 'approved'
      const expected =
        'review' in entry
          ? entry.review.status === 'approved'
            ? entry.review.accepted
            : []
          : entry.expected
      return {
        expected,
        id: entry.id,
        outcome: excluded
          ? 'excluded'
          : predicted === null
            ? 'not-selected'
            : acceptedKinds(expected).includes(predicted)
              ? 'correct'
              : 'misclassified',
        predicted,
        ...('review' in entry ? {reviewStatus: entry.review.status} : {}),
      }
    },
  )
  const positivePairs = cases.filter(positiveCase).length
  const selectedPositivePairs = cases.filter(
    (entry) => positiveCase(entry) && entry.predicted !== null,
  ).length
  const scored = cases.filter((entry) => entry.outcome !== 'excluded')
  const classified = scored.filter((entry) => entry.predicted !== null).length
  const correct = cases.filter((entry) => entry.outcome === 'correct').length
  return {
    cases,
    comparison: null,
    datasetHash:
      dataset.version === 2
        ? hash(dataset)
        : hash([
            dataset.version,
            dataset.kind,
            dataset.repoId,
            dataset.workspaceId,
            dataset.kind === 'golden' ? [dataset.review.reviewer, dataset.review.reviewedAt] : null,
            dataset.cases.map((entry) => [
              entry.id,
              entry.expected,
              [entry.left.docId, entry.left.unitId, entry.left.contentHash],
              [entry.right.docId, entry.right.unitId, entry.right.contentHash],
            ]),
          ]),
    diagnostic,
    provisional: dataset.kind === 'draft',
    sourceHash: hash(
      diagnostic.semantic.sourceUnits
        .map((target) => [target.docId, target.unitId, target.contentHash])
        .toSorted((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    ),
    summary: {
      ...(dataset.version === 2
        ? {approvedCases: scored.length, excludedCases: cases.length - scored.length}
        : {}),
      candidateSelectionRecall: positivePairs === 0 ? null : selectedPositivePairs / positivePairs,
      classificationAccuracy: classified === 0 ? null : correct / classified,
      classified,
      correct,
      positivePairs,
      selectedPositivePairs,
      unlabelledAssessments: predictions.size - classified,
    },
    version: dataset.version,
  }
}
const delta = (current: number | null, previous: number | null): number | null =>
  current === null || previous === null ? null : current - previous
interface CompareInspectionOptions {
  readonly baseline: unknown
  readonly dataset: InspectionDataset
  readonly report: InspectionEvaluationReport
}
const compareInspection = (options: CompareInspectionOptions): InspectionEvaluationResult => {
  const parsed = z
    .object({
      cases: z.unknown(),
      datasetHash: z.string(),
      diagnostic: diagnosticSchema,
      provisional: z.boolean(),
      sourceHash: z.string(),
      summary: z.unknown(),
      version: z.union([z.literal(1), z.literal(2)]),
    })
    .safeParse(options.baseline)
  const failure = {error: {code: 'invalid-inspection-baseline'}, ok: false} as const
  if (!parsed.success || !validObservation(options.dataset, parsed.data.diagnostic)) {
    return failure
  }
  const baseline = parsed.data
  const replay = scoreDiagnostic(options.dataset, baseline.diagnostic)
  const {report} = options
  const previous = replay.diagnostic.semantic
  const current = report.diagnostic.semantic
  if (
    baseline.version !== report.version ||
    baseline.datasetHash !== report.datasetHash ||
    baseline.sourceHash !== report.sourceHash ||
    baseline.sourceHash !== replay.sourceHash ||
    baseline.provisional !== replay.provisional ||
    !isDeepStrictEqual(baseline.cases, replay.cases) ||
    !isDeepStrictEqual(baseline.summary, replay.summary) ||
    previous.limit !== current.limit ||
    previous.retrieval.seedLimit !== current.retrieval.seedLimit ||
    previous.retrieval.neighborsPerUnit !== current.retrieval.neighborsPerUnit
  ) {
    return failure
  }
  const regressions = report.cases
    .filter((entry, index) => {
      const before = replay.cases[index]
      return (
        entry.outcome !== 'excluded' &&
        ((before.outcome === 'correct' && entry.outcome !== 'correct') ||
          (before.predicted !== null && entry.predicted === null))
      )
    })
    .map(({id}) => id)
  return {
    ok: true,
    value: {
      ...report,
      comparison: {
        candidateSelectionRecallDelta: delta(
          report.summary.candidateSelectionRecall,
          replay.summary.candidateSelectionRecall,
        ),
        classificationAccuracyDelta: delta(
          report.summary.classificationAccuracy,
          replay.summary.classificationAccuracy,
        ),
        regressions,
      },
    },
  }
}
/** Evaluates completed doctor diagnostics against reviewed or explicitly provisional pair labels without model calls. */
export const createInspectionEvaluation = (
  options: CreateInspectionEvaluationOptions,
): InspectionEvaluationResult => {
  const dataset = datasetSchema.safeParse(options.dataset)
  if (!dataset.success || !validLabels(dataset.data)) {
    return {error: {code: 'invalid-inspection-dataset'}, ok: false}
  }
  const diagnostic = diagnosticSchema.safeParse(options.diagnostic)
  if (!diagnostic.success || !validObservation(dataset.data, diagnostic.data)) {
    return {error: {code: 'invalid-inspection-diagnostic'}, ok: false}
  }
  const report = scoreDiagnostic(dataset.data, diagnostic.data)
  return options.baseline === undefined
    ? {ok: true, value: report}
    : compareInspection({baseline: options.baseline, dataset: dataset.data, report})
}
