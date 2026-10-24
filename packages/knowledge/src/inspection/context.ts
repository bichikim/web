import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {z} from 'zod'
import type {StoredKnowledgePoint} from '../indexing/store'
import {createEvidencePassages, type EvidencePassage} from './evidence'
import {
  type Assessment,
  inspectionKey,
  type InspectionModel,
  type InspectionPair,
  parseAssessment,
} from './pairs'

export const CONTEXTUAL_INSPECTION_VERSION = 8
export interface CollectInspectionContextOptions {
  readonly pair: InspectionPair
  readonly points: ReadonlyArray<StoredKnowledgePoint>
}
const links = (source: StoredKnowledgePoint, target: StoredKnowledgePoint): boolean =>
  source.payload.relations.some(
    (relation) =>
      relation.targetDocId === target.payload.docId &&
      (relation.targetUnitId === undefined || relation.targetUnitId === target.payload.unitId),
  )
/** Collects active same-document and directly linked units from the pair's repository workspace snapshot. */
export const collectInspectionContext = (
  options: CollectInspectionContextOptions,
): ReadonlyArray<StoredKnowledgePoint> => {
  const {left, right} = options.pair
  return options.points
    .filter(
      (point) =>
        point.pointId !== left.pointId &&
        point.pointId !== right.pointId &&
        point.payload.status === 'active' &&
        point.payload.repoId === left.payload.repoId &&
        point.payload.workspaceId === left.payload.workspaceId &&
        [left, right].some(
          (source) =>
            source.payload.docId === point.payload.docId ||
            links(source, point) ||
            links(point, source),
        ),
    )
    .toSorted((first, second) => first.pointId.localeCompare(second.pointId))
}
export interface ContextSource {
  readonly pointId: string
  readonly docId: string
  readonly unitId: string
  readonly contentHash: string
  readonly path: string
  readonly startLine?: number
  readonly endLine?: number
  readonly title: string
  readonly text: string
  readonly truncated: boolean
}
export interface ContextSelection {
  readonly eligible: number
  readonly sources: ReadonlyArray<ContextSource>
  readonly truncated: boolean
}
export interface SelectInspectionContextOptions {
  readonly maxSources?: number
  readonly maxTotal?: number
  readonly points: ReadonlyArray<StoredKnowledgePoint>
  readonly questions: ReadonlyArray<string>
}
const prefix = (text: string, limit: number): string => {
  let result = ''
  for (const character of text) {
    if (result.length + character.length > limit) {
      return result
    }
    result += character
  }
  return result
}
/** Ranks structurally related units by question terms and returns bounded verbatim excerpts with provenance. */
export const selectInspectionContext = (
  options: SelectInspectionContextOptions,
): ContextSelection => {
  const DEFAULT_SOURCES = 6
  const MAX_SOURCES = options.maxSources ?? DEFAULT_SOURCES
  const MAX_TEXT = 4000
  const DEFAULT_TOTAL = 12000
  const MAX_TOTAL = options.maxTotal ?? DEFAULT_TOTAL
  const terms = [
    ...new Set(
      options.questions
        .join(' ')
        .toLowerCase()
        .match(/[\p{L}\p{N}_]+/gu) ?? [],
    ),
  ]
  const score = (point: StoredKnowledgePoint): number =>
    terms.filter((term) =>
      `${point.payload.title} ${point.payload.text}`.toLowerCase().includes(term),
    ).length
  const ranked = options.points.toSorted(
    (first, second) => score(second) - score(first) || first.pointId.localeCompare(second.pointId),
  )
  const sources: ContextSource[] = []
  let remaining = MAX_TOTAL
  for (const {pointId, payload} of ranked) {
    if (sources.length < MAX_SOURCES && remaining > 0) {
      const excerpt = prefix(payload.text, Math.min(MAX_TEXT, remaining))
      remaining -= excerpt.length
      sources.push({
        contentHash: payload.contentHash,
        docId: payload.docId,
        path: payload.path,
        pointId,
        text: excerpt,
        title: payload.title,
        truncated: excerpt.length < payload.text.length,
        unitId: payload.unitId,
        ...(payload.startLine === undefined ? {} : {startLine: payload.startLine}),
        ...(payload.endLine === undefined ? {} : {endLine: payload.endLine}),
      })
    }
  }
  return {
    eligible: ranked.length,
    sources,
    truncated: sources.length < ranked.length || sources.some((source) => source.truncated),
  }
}
export interface ContextualKeyOptions extends CollectInspectionContextOptions {
  readonly model: InspectionModel
}
/** Includes the complete eligible context snapshot so changes outside selected excerpts invalidate prior decisions. */
export const contextualKey = (options: ContextualKeyOptions): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        inspectionKey({...options, promptVersion: CONTEXTUAL_INSPECTION_VERSION}),
        options.points.toSorted((first, second) => first.pointId.localeCompare(second.pointId)),
      ]),
    )
    .digest('hex')
export interface ContextReview {
  readonly initial: Assessment
  readonly proposed?: Assessment
  readonly questions: ReadonlyArray<string>
  readonly selection: ContextSelection
  readonly citations: ReadonlyArray<string>
  readonly unresolved: ReadonlyArray<string>
}
export interface ContextualSuccess {
  readonly ok: true
  readonly value: Assessment
  readonly review: ContextReview
}
export interface ContextualFailure {
  readonly ok: false
  readonly error: {readonly code: string}
}
export type ContextualResult = ContextualSuccess | ContextualFailure
/** Gives each supplemental passage a source-specific identifier; text remains a verbatim excerpt. */
export const contextPassages = (selection: ContextSelection): ReadonlyArray<EvidencePassage> =>
  selection.sources.flatMap((source, index) =>
    createEvidencePassages({side: 'left', text: source.text}).map((passage) => ({
      id: `context-${index + 1}-${passage.id}`,
      text: passage.text,
    })),
  )
const MAX_QUESTIONS = 3
const MAX_QUESTION = 300
export const contextQuestionsSchema = z
  .array(z.string().trim().min(1).max(MAX_QUESTION))
  .max(MAX_QUESTIONS)
  .refine((questions) => new Set(questions).size === questions.length)
const MAX_CITATIONS = 6
const reviewSchema = z
  .object({
    citations: z.array(z.string()).max(MAX_CITATIONS),
    initial: z.unknown(),
    proposed: z.unknown().optional(),
    questions: contextQuestionsSchema,
    selection: z.unknown(),
    unresolved: contextQuestionsSchema,
  })
  .strict()
export interface ParseContextualReviewOptions extends CollectInspectionContextOptions {
  readonly assessment: unknown
  readonly review: unknown
}
export interface ResolveContextAssessmentOptions {
  readonly proposed: Assessment
  readonly unresolved: ReadonlyArray<string>
}
/** Unresolved comparison conditions determine uncertainty regardless of the model's proposed kind. */
export const resolveContextAssessment = (options: ResolveContextAssessmentOptions): Assessment =>
  options.unresolved.length === 0
    ? options.proposed
    : {
        ...options.proposed,
        kind: 'uncertain',
        reason: `추가 문맥으로도 확인되지 않은 조건: ${options.unresolved.join(' / ')}`,
      }
interface MatchesContextDecisionOptions {
  readonly assessment: Assessment
  readonly review: ContextReview
}
const matchesContextDecision = (options: MatchesContextDecisionOptions): boolean => {
  const {assessment, review} = options
  if (review.questions.length === 0) {
    return review.proposed === undefined && isDeepStrictEqual(review.initial, assessment)
  }
  if (review.selection.sources.length === 0) {
    return (
      review.proposed === undefined &&
      assessment.kind === 'uncertain' &&
      isDeepStrictEqual(review.unresolved, review.questions)
    )
  }
  return (
    review.proposed !== undefined &&
    isDeepStrictEqual(
      assessment,
      resolveContextAssessment({proposed: review.proposed, unresolved: review.unresolved}),
    )
  )
}
/** Revalidates cached or generated context provenance, exact citations and unresolved-condition policy. */
export const parseContextualReview = (options: ParseContextualReviewOptions): ContextualResult => {
  const failure = {error: {code: 'invalid-inspection-context'}, ok: false} as const
  const parsed = reviewSchema.safeParse(options.review)
  const assessment = parseAssessment({input: options.assessment, pair: options.pair})
  if (!parsed.success || !assessment.ok) {
    return failure
  }
  const review = parsed.data
  const initial = parseAssessment({input: review.initial, pair: options.pair})
  const proposed =
    review.proposed === undefined
      ? undefined
      : parseAssessment({input: review.proposed, pair: options.pair})
  if (!initial.ok || (proposed !== undefined && !proposed.ok)) {
    return failure
  }
  const selection = selectInspectionContext({
    points: review.questions.length === 0 ? [] : options.points,
    questions: review.questions,
  })
  const passages = new Set(contextPassages(selection).map(({id}) => id))
  if (
    !isDeepStrictEqual(review.selection, selection) ||
    review.citations.some((id) => !passages.has(id)) ||
    new Set(review.citations).size !== review.citations.length ||
    review.unresolved.some((question) => !review.questions.includes(question)) ||
    (review.questions.length > 0 &&
      review.unresolved.length === 0 &&
      review.citations.length === 0) ||
    (selection.sources.length === 0 && !isDeepStrictEqual(review.unresolved, review.questions))
  ) {
    return failure
  }
  const value: ContextReview = {
    citations: review.citations,
    initial: initial.value,
    questions: review.questions,
    selection,
    unresolved: review.unresolved,
    ...(proposed === undefined ? {} : {proposed: proposed.value}),
  }
  return matchesContextDecision({assessment: assessment.value, review: value})
    ? {ok: true, review: value, value: assessment.value}
    : failure
}
