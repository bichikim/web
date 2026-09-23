import {createHash} from 'node:crypto'
import {z} from 'zod'
import type {EvaluationDataset} from './report'

export const QUESTION_PROMPT_VERSION = 1
export interface QuestionPair {
  readonly en: string
  readonly ko: string
}
export interface QuestionModel {
  readonly digest: string
  readonly name: string
}
export interface GenerationSource {
  readonly contentHash: string
  readonly docId: string
  readonly text: string
  readonly title: string
  readonly unitId: string
}
export interface GenerationKeyOptions {
  readonly model: QuestionModel
  readonly promptVersion?: number
  readonly repoId: string
  readonly source: GenerationSource
  readonly workspaceId: string
}
export interface GeneratedCase {
  readonly cacheKey: string
  readonly id: string
  readonly language: 'ko' | 'en'
  readonly model: QuestionModel
  readonly promptVersion: number
  readonly query: string
  readonly source: {
    readonly contentHash: string
    readonly docId: string
    readonly unitId: string
  }
}
interface GeneratedBase {
  readonly cases: ReadonlyArray<GeneratedCase>
  readonly repoId: string
  readonly version: 1
  readonly workspaceId: string
}
export interface CandidateSet extends GeneratedBase {
  readonly kind: 'candidate'
}
export interface GoldenSet extends GeneratedBase {
  readonly kind: 'golden'
  readonly review: {
    readonly candidateHash: string
    readonly reviewedAt: string
    readonly reviewer: string
  }
}
export type GeneratedEvaluation = CandidateSet | GoldenSet
export interface GenerationFailure {
  readonly error: {
    readonly code:
      | 'invalid-questions'
      | 'invalid-generated-evaluation'
      | 'invalid-evaluation-approval'
      | 'question-model-unavailable'
      | 'question-generation-failed'
      | 'question-model-changed'
  }
  readonly ok: false
}
export interface GenerationSuccess<T> {
  readonly ok: true
  readonly value: T
}
export type GenerationResult<T> = GenerationFailure | GenerationSuccess<T>

const MAX_QUERY_LENGTH = 4096
const MAX_GENERATED_CASES = 200
const textSchema = z.string().trim().min(1).max(MAX_QUERY_LENGTH)
const identifier = textSchema.regex(/^[^\s#]+$/u)
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/u)
const modelSchema = z.object({digest: hashSchema, name: textSchema}).strict()
const koreanQuery = textSchema.regex(/[가-힣]/u)
const englishQuery = textSchema.regex(/[a-z]/iu).refine((value) => !/[가-힣]/u.test(value))
const questionsSchema = z.object({en: englishQuery, ko: koreanQuery}).strict()
const generatedCaseSchema = z
  .object({
    cacheKey: hashSchema,
    id: identifier,
    language: z.enum(['ko', 'en']),
    model: modelSchema,
    promptVersion: z.number().int().positive(),
    query: textSchema,
    source: z
      .object({
        contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
        docId: identifier,
        unitId: identifier,
      })
      .strict(),
  })
  .strict()
  .refine(
    (entry) =>
      entry.id === `${entry.cacheKey}-${entry.language}` &&
      (entry.language === 'ko' ? koreanQuery : englishQuery).safeParse(entry.query).success,
  )
const baseShape = {
  cases: z.array(generatedCaseSchema).min(1).max(MAX_GENERATED_CASES),
  repoId: textSchema,
  version: z.literal(1),
  workspaceId: textSchema,
}
const generatedSchema = z
  .discriminatedUnion('kind', [
    z.object({...baseShape, kind: z.literal('candidate')}).strict(),
    z
      .object({
        ...baseShape,
        kind: z.literal('golden'),
        review: z
          .object({candidateHash: hashSchema, reviewedAt: z.iso.datetime(), reviewer: textSchema})
          .strict(),
      })
      .strict(),
  ])
  .refine(({cases}) => new Set(cases.map(({id}) => id)).size === cases.length)

/** Parses one Korean and one English question, without accepting model-selected answer IDs. */
export const parseQuestions = (input: unknown): GenerationResult<QuestionPair> => {
  const parsed = questionsSchema.safeParse(input)
  return parsed.success
    ? {ok: true, value: parsed.data}
    : {error: {code: 'invalid-questions'}, ok: false}
}

/** Identifies generation inputs including model bytes, source content and prompt policy version. */
export const generationKey = (options: GenerationKeyOptions): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        options.repoId,
        options.workspaceId,
        options.source.docId,
        options.source.unitId,
        options.source.contentHash,
        options.source.title,
        options.source.text,
        options.model.name,
        options.model.digest,
        options.promptVersion ?? QUESTION_PROMPT_VERSION,
      ]),
    )
    .digest('hex')

export interface CandidateEntry extends GenerationKeyOptions {
  readonly questions: QuestionPair
}
export interface CreateCandidateSetOptions {
  readonly entries: ReadonlyArray<CandidateEntry>
  readonly repoId: string
  readonly workspaceId: string
}
/** Builds unapproved cases whose expected units come exclusively from the indexed source. */
export const createCandidateSet = (options: CreateCandidateSetOptions): CandidateSet => ({
  cases: options.entries.flatMap((entry) => {
    const cacheKey = generationKey(entry)
    return (['ko', 'en'] as const).map((language) => ({
      cacheKey,
      id: `${cacheKey}-${language}`,
      language,
      model: entry.model,
      promptVersion: entry.promptVersion ?? QUESTION_PROMPT_VERSION,
      query: entry.questions[language],
      source: {
        contentHash: entry.source.contentHash,
        docId: entry.source.docId,
        unitId: entry.source.unitId,
      },
    }))
  }),
  kind: 'candidate',
  repoId: options.repoId,
  version: 1,
  workspaceId: options.workspaceId,
})

/** Validates candidate or explicitly reviewed golden files and their provenance fields. */
export const parseGeneratedEvaluation = (input: unknown): GenerationResult<GeneratedEvaluation> => {
  const parsed = generatedSchema.safeParse(input)
  return parsed.success
    ? {ok: true, value: parsed.data}
    : {error: {code: 'invalid-generated-evaluation'}, ok: false}
}

/** Projects generated artifacts into the existing search-evaluation dataset contract. */
export const toEvaluationDataset = (input: GeneratedEvaluation): EvaluationDataset => ({
  cases: input.cases.map((entry) => ({
    expected: [{docId: entry.source.docId, unitId: entry.source.unitId}],
    id: entry.id,
    query: entry.query,
  })),
  version: 1,
})

export interface ApproveEvaluationOptions {
  readonly candidate: unknown
  readonly ids: ReadonlyArray<string>
  readonly reviewedAt: string
  readonly reviewer: string
}
/** Selects explicitly reviewed candidates into a new golden artifact without mutating the source. */
export const approveEvaluation = (
  options: ApproveEvaluationOptions,
): GenerationResult<GoldenSet> => {
  const parsed = parseGeneratedEvaluation(options.candidate)
  const failure = {error: {code: 'invalid-evaluation-approval'}, ok: false} as const
  if (
    !parsed.ok ||
    parsed.value.kind !== 'candidate' ||
    options.ids.length === 0 ||
    new Set(options.ids).size !== options.ids.length ||
    options.ids.some((id) => !parsed.value.cases.some((entry) => entry.id === id)) ||
    !textSchema.safeParse(options.reviewer).success ||
    !z.iso.datetime().safeParse(options.reviewedAt).success
  ) {
    return failure
  }
  return {
    ok: true,
    value: {
      ...parsed.value,
      cases: parsed.value.cases.filter(({id}) => options.ids.includes(id)),
      kind: 'golden',
      review: {
        candidateHash: createHash('sha256').update(JSON.stringify(parsed.value)).digest('hex'),
        reviewedAt: options.reviewedAt,
        reviewer: options.reviewer.trim(),
      },
    },
  }
}
