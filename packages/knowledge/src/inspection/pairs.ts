import {createHash} from 'node:crypto'
import {z} from 'zod'
import type {StoredKnowledgePoint} from '../indexing/store'

export const INSPECTION_PROMPT_VERSION = 3
export const SEPARATED_INSPECTION_VERSION = 7
export type InspectionMode = 'combined' | 'separated' | 'contextual' | 'research'
export interface InspectionModel {
  readonly digest: string
  readonly name: string
}
export interface InspectionPair {
  readonly left: StoredKnowledgePoint
  readonly right: StoredKnowledgePoint
}
export interface Assessment {
  readonly confidence: number
  readonly kind: 'duplicate' | 'conflict' | 'unrelated' | 'uncertain'
  readonly leftQuote: string
  readonly reason: string
  readonly rightQuote: string
}
export interface InspectionFailure {
  readonly error: {readonly code: string}
  readonly ok: false
}
export interface AssessmentSuccess {
  readonly ok: true
  readonly value: Assessment
}
export type AssessmentResult = AssessmentSuccess | InspectionFailure
export interface PairSelection {
  readonly consideredUnits: number
  readonly eligibleUnits: number
  readonly pairs: ReadonlyArray<InspectionPair>
  readonly totalPairs: number
  readonly truncated: boolean
}
export interface SelectInspectionPairsOptions {
  readonly limit: number
  readonly points: ReadonlyArray<StoredKnowledgePoint>
}
/** Selects a bounded deterministic active-unit sample; truncation is not evidence of corpus-wide absence. */
export const selectInspectionPairs = (options: SelectInspectionPairsOptions): PairSelection => {
  const MAX_UNITS = 20
  const active = options.points
    .filter(({payload}) => payload.status === 'active')
    .toSorted((left, right) => left.pointId.localeCompare(right.pointId))
  const sample = active.slice(0, MAX_UNITS)
  const pairs = sample
    .flatMap((left, index) => sample.slice(index + 1).map((right) => ({left, right})))
    .slice(0, options.limit)
  const PAIR_DIVISOR = 2
  const totalPairs = (active.length * (active.length - 1)) / PAIR_DIVISOR
  return {
    consideredUnits: sample.length,
    eligibleUnits: active.length,
    pairs,
    totalPairs,
    truncated: pairs.length < totalPairs,
  }
}
export interface InspectionKeyOptions {
  readonly model: InspectionModel
  readonly pair: InspectionPair
  readonly promptVersion?: number
}
/** Keys model diagnostics by source scope, content, model bytes and prompt policy, independent of pair order. */
export const inspectionKey = (options: InspectionKeyOptions): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        'inspection',
        options.promptVersion ?? INSPECTION_PROMPT_VERSION,
        options.model.name,
        options.model.digest,
        ...[options.pair.left, options.pair.right]
          .toSorted((left, right) => left.pointId.localeCompare(right.pointId))
          .map(({payload, pointId}) => [
            pointId,
            payload.repoId,
            payload.workspaceId,
            payload.docId,
            payload.unitId,
            payload.contentHash,
            payload.title,
            payload.text,
            payload.status,
          ]),
      ]),
    )
    .digest('hex')
const MAX_REASON = 1000
const MAX_QUOTE = 800
const schema = z
  .object({
    confidence: z.number().min(0).max(1),
    kind: z.enum(['duplicate', 'conflict', 'unrelated', 'uncertain']),
    leftQuote: z.string().max(MAX_QUOTE),
    reason: z.string().trim().min(1).max(MAX_REASON),
    rightQuote: z.string().max(MAX_QUOTE),
  })
  .strict()
export interface ParseAssessmentOptions {
  readonly input: unknown
  readonly pair: InspectionPair
}
/** Validates model output and checks that non-empty evidence quotes occur verbatim in their source units. */
export const parseAssessment = (options: ParseAssessmentOptions): AssessmentResult => {
  const parsed = schema.safeParse(options.input)
  const failure = {error: {code: 'invalid-inspection-response'}, ok: false} as const
  if (!parsed.success) {
    return failure
  }
  const value = parsed.data
  if (
    !options.pair.left.payload.text.includes(value.leftQuote) ||
    !options.pair.right.payload.text.includes(value.rightQuote)
  ) {
    return failure
  }
  switch (value.kind) {
    case 'duplicate':
    case 'conflict':
      if (value.leftQuote.trim() === '' || value.rightQuote.trim() === '') {
        return failure
      }
      break
    case 'unrelated':
    case 'uncertain':
      break
    default: {
      const exhaustive: never = value.kind
      return exhaustive
    }
  }
  return {ok: true, value}
}
