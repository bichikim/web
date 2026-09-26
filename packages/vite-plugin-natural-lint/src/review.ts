import {mkdir, readFile, rename, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {z} from 'zod'
import {createRuleFingerprint} from './core'
import type {
  DecisionAnswer,
  DecisionAnswers,
  DecisionQuestions,
  DecisionValue,
  ProjectAnalysisReport,
  ResolvedNaturalLintOptions,
} from './types'

export const REVIEW_LABELS = ['pass', 'fail', 'uncertain', 'skip'] as const
export type ReviewLabel = (typeof REVIEW_LABELS)[number]
export const REVIEW_LABEL_SOURCES = ['human', 'accepted-model'] as const
export type ReviewLabelSource = (typeof REVIEW_LABEL_SOURCES)[number]
export const REVIEW_SPLITS = ['train', 'validation', 'holdout', 'unassigned'] as const
export type ReviewSplit = (typeof REVIEW_SPLITS)[number]

export interface ReviewAnswer {
  readonly label: ReviewLabel
  readonly labelSource?: ReviewLabelSource
  readonly split?: ReviewSplit
}

export interface ReviewCandidate {
  readonly answers: DecisionAnswers
  readonly caseIndex?: number
  readonly modelProbability: number
  readonly observedStatus: 'fail' | 'pass' | 'uncertain'
  readonly providerIdentifier: string
  readonly providerRevision: string
  readonly questions: DecisionQuestions
  readonly relativePath: string
  readonly ruleFingerprint: string
  readonly ruleId: string
  readonly state: DecisionValue
}

export interface ReviewRecord extends ReviewCandidate {
  readonly label: ReviewLabel
  readonly labelSource?: ReviewLabelSource
  readonly schemaVersion: 1
  readonly split?: ReviewSplit
}

const rejectAcceptedModelSkip = (
  answer: Pick<ReviewAnswer, 'label' | 'labelSource'>,
  context: z.RefinementCtx,
): void => {
  if (answer.labelSource === 'accepted-model' && answer.label === 'skip') {
    context.addIssue({
      code: 'custom',
      message: 'accepted-model labels cannot be skip.',
      path: ['label'],
    })
  }
}

const answerSchema = z
  .object({
    caseIndex: z.number().int().min(0).optional(),
    label: z.enum(REVIEW_LABELS),
    labelSource: z.enum(REVIEW_LABEL_SOURCES).optional(),
    relativePath: z.string(),
    ruleId: z.string(),
    split: z.enum(REVIEW_SPLITS).optional(),
  })
  .strict()
  .superRefine(rejectAcceptedModelSkip)

const probabilitySchema = z.number().finite().min(0).max(1)
const decisionValueSchema: z.ZodType<DecisionValue> = z.lazy(() =>
  z.union([
    z.array(decisionValueSchema),
    z.record(z.string(), decisionValueSchema),
    z.boolean(),
    z.null(),
    z.number().finite(),
    z.string(),
  ]),
)
const questionSchema = z.discriminatedUnion('type', [
  z
    .object({
      criteria: z
        .object({false: z.string().optional(), true: z.string().optional()})
        .strict()
        .optional(),
      instruction: z.string(),
      type: z.literal('noul'),
    })
    .strict(),
  z
    .object({
      criteria: z.union([z.array(z.string()), z.record(z.string(), z.string().nullable())]),
      instruction: z.string(),
      type: z.literal('choice'),
    })
    .strict(),
])
const decisionAnswerSchema = z.discriminatedUnion('type', [
  z.object({probability: probabilitySchema, type: z.literal('noul')}).strict(),
  z
    .object({
      choice: z.string(),
      confidence: probabilitySchema,
      probabilities: z.record(z.string(), probabilitySchema),
      type: z.literal('choice'),
    })
    .strict(),
])
const reviewRecordSchema: z.ZodType<ReviewRecord> = z
  .object({
    answers: z.record(z.string(), decisionAnswerSchema),
    caseIndex: z.number().int().min(0).optional(),
    label: z.enum(REVIEW_LABELS),
    labelSource: z.enum(REVIEW_LABEL_SOURCES).optional(),
    modelProbability: probabilitySchema,
    observedStatus: z.enum(['fail', 'pass', 'uncertain']),
    providerIdentifier: z.string(),
    providerRevision: z.string(),
    questions: z.record(z.string(), questionSchema),
    relativePath: z.string(),
    ruleFingerprint: z.string(),
    ruleId: z.string(),
    schemaVersion: z.literal(1),
    split: z.enum(REVIEW_SPLITS).optional(),
    state: decisionValueSchema,
  })
  .strict()
  .superRefine(rejectAcceptedModelSkip)

const PERCENT_SCALE = 100
const SOURCE_PREVIEW_LINES = 80

const percentage = (probability: number): string => `${(probability * PERCENT_SCALE).toFixed(1)}%`

const formatAnswer = (answer: DecisionAnswer): string => {
  switch (answer.type) {
    case 'choice':
      return [
        `choice=${answer.choice}`,
        `confidence=${percentage(answer.confidence)}`,
        `probabilities=${Object.entries(answer.probabilities)
          .map(([choice, probability]) => `${choice}:${percentage(probability)}`)
          .join(',')}`,
      ].join(' ')
    case 'noul':
      return `probability=${percentage(answer.probability)}`
    default: {
      const exhaustive: never = answer
      return exhaustive
    }
  }
}

export const formatReviewCandidate = (candidate: ReviewCandidate): string => {
  const answers = Object.entries(candidate.questions).map(([questionId, question]) => {
    const answer = candidate.answers[questionId]
    const formatted = answer === undefined ? 'answer=missing' : formatAnswer(answer)
    return `- ${questionId}: ${question.instruction}\n  ${formatted}`
  })
  return [
    `${candidate.ruleId} · ${candidate.relativePath}`,
    `Final verdict: ${candidate.observedStatus}`,
    `Final probability: ${percentage(candidate.modelProbability)}`,
    'Model answers:',
    ...answers,
    `State: ${JSON.stringify(candidate.state)}`,
  ].join('\n')
}

export const createSourcePreview = (source: string): string => {
  const lines = source.split('\n')
  const visible = lines.slice(0, SOURCE_PREVIEW_LINES)
  const width = String(visible.length).length
  return [
    ...visible.map((line, index) => `${String(index + 1).padStart(width)} │ ${line}`),
    ...(lines.length > visible.length
      ? [`… ${lines.length - visible.length} more lines (open the file for the rest)`]
      : []),
  ].join('\n')
}

export const formatSource = (source: string): string => {
  const lines = source.split('\n')
  const width = String(lines.length).length
  return lines.map((line, index) => `${String(index + 1).padStart(width)} │ ${line}`).join('\n')
}

export const createPendingReviewCandidates = (
  candidates: ReadonlyArray<ReviewCandidate>,
  reviewed: ReadonlyArray<ReviewCandidate>,
): ReadonlyArray<ReviewCandidate> => {
  const reviewedKeys = new Set(reviewed.map(recordKey))
  return candidates.filter((candidate) => !reviewedKeys.has(recordKey(candidate)))
}

const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

export const createReviewCaseKey = (
  value: Pick<ReviewCandidate, 'caseIndex' | 'relativePath' | 'ruleFingerprint' | 'state'>,
): string =>
  JSON.stringify([
    value.ruleFingerprint,
    value.relativePath,
    value.state,
    ...(value.caseIndex === undefined ? [] : [value.caseIndex]),
  ])

export const reviewAnswerKey = (
  candidate: Pick<ReviewCandidate, 'caseIndex' | 'relativePath' | 'ruleId'>,
): string => JSON.stringify([candidate.ruleId, candidate.relativePath, candidate.caseIndex ?? null])

const recordKey = (
  value: Pick<
    ReviewCandidate,
    | 'caseIndex'
    | 'providerIdentifier'
    | 'providerRevision'
    | 'relativePath'
    | 'ruleFingerprint'
    | 'state'
  >,
): string =>
  JSON.stringify([createReviewCaseKey(value), value.providerIdentifier, value.providerRevision])

const parseJsonLines = (source: string): ReadonlyArray<unknown> =>
  source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown)

export const createReviewCandidates = (
  report: ProjectAnalysisReport,
  options: ResolvedNaturalLintOptions,
  provider: {readonly identifier: string; readonly revision: string},
): ReadonlyArray<ReviewCandidate> => {
  const rules = new Map(options.rules.map((rule) => [rule.id, rule]))
  return report.experiments.flatMap((experiment) => {
    const rule = rules.get(experiment.ruleId)
    if (rule === undefined) {
      return []
    }
    const ruleFingerprint = createRuleFingerprint(rule)
    return experiment.observations.flatMap((observation) =>
      (observation.cases ?? [observation]).flatMap((item, caseIndex) =>
        item.answers === undefined || item.state === undefined
          ? []
          : [
              {
                answers: item.answers,
                ...(observation.cases === undefined ? {} : {caseIndex}),
                modelProbability: item.probability,
                observedStatus: item.status,
                providerIdentifier: provider.identifier,
                providerRevision: provider.revision,
                questions: rule.questions,
                relativePath: item.relativePath,
                ruleFingerprint,
                ruleId: rule.id,
                state: item.state,
              },
            ],
      ),
    )
  })
}

export const readReviewRecords = async (filePath: string): Promise<ReadonlyArray<ReviewRecord>> => {
  try {
    return parseJsonLines(await readFile(filePath, 'utf8')).map((value) =>
      reviewRecordSchema.parse(value),
    )
  } catch (error: unknown) {
    if (isMissingFile(error)) {
      return []
    }
    throw error
  }
}

export const readReviewAnswers = async (
  filePath: string,
): Promise<ReadonlyMap<string, ReviewAnswer>> => {
  const answers = parseJsonLines(await readFile(filePath, 'utf8')).map((value) =>
    answerSchema.parse(value),
  )
  return new Map(
    answers.map((answer) => [
      reviewAnswerKey(answer),
      {
        label: answer.label,
        ...(answer.labelSource === undefined ? {} : {labelSource: answer.labelSource}),
        ...(answer.split === undefined ? {} : {split: answer.split}),
      },
    ]),
  )
}

export const mergeReviewRecords = (
  candidates: ReadonlyArray<ReviewCandidate>,
  existing: ReadonlyArray<ReviewRecord>,
  labels: ReadonlyMap<string, ReviewAnswer | ReviewLabel>,
): ReadonlyArray<ReviewRecord> => {
  const records = new Map(existing.map((record) => [recordKey(record), record]))
  for (const candidate of candidates) {
    const answer =
      labels.get(reviewAnswerKey(candidate)) ??
      (candidate.caseIndex === undefined
        ? labels.get(`${candidate.ruleId}:${candidate.relativePath}`)
        : undefined)
    if (answer !== undefined) {
      const normalized =
        typeof answer === 'string'
          ? {label: answer, labelSource: 'human' as const}
          : {labelSource: 'human' as const, ...answer}
      records.set(recordKey(candidate), {...candidate, ...normalized, schemaVersion: 1})
    }
  }
  return [...records.values()].sort((left, right) =>
    recordKey(left).localeCompare(recordKey(right)),
  )
}

const writeJsonLines = async (filePath: string, values: ReadonlyArray<unknown>): Promise<void> => {
  await mkdir(path.dirname(filePath), {recursive: true})
  const temporary = `${filePath}.${process.pid}.tmp`
  await writeFile(temporary, `${values.map((value) => JSON.stringify(value)).join('\n')}\n`)
  await rename(temporary, filePath)
}

export const writeReviewArtifacts = async (
  reviewPath: string,
  trainingPath: string,
  records: ReadonlyArray<ReviewRecord>,
): Promise<void> => {
  await writeJsonLines(reviewPath, records)
  await writeJsonLines(trainingPath, createTrainingRecords(records))
}

export const createTrainingRecords = (
  records: ReadonlyArray<ReviewRecord>,
): ReadonlyArray<ReviewRecord> =>
  [...Map.groupBy(records, createReviewCaseKey).values()].flatMap((matches) => {
    const humanDecisions = matches.filter(
      ({label, labelSource}) =>
        labelSource !== 'accepted-model' && (label === 'fail' || label === 'pass'),
    )
    const labels = new Set(humanDecisions.map(({label}) => label))
    const protectedFromTraining = humanDecisions.some(
      ({split}) => split === 'holdout' || split === 'validation',
    )
    const [representative] = humanDecisions
    return representative === undefined || labels.size !== 1 || protectedFromTraining
      ? []
      : [representative]
  })
