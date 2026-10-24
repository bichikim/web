import {isDeepStrictEqual} from 'node:util'
import type {KnowledgeIndexSearchResult, StoredKnowledgePoint} from '../indexing/store'
import type {AuditQuestion, InquiryAuditRecord} from './audit'
import {
  contextPassages,
  contextQuestionsSchema,
  type ContextSelection,
  resolveContextAssessment,
  selectInspectionContext,
} from './context'
import {
  type Assessment,
  type InspectionFailure,
  type InspectionPair,
  parseAssessment,
} from './pairs'

export const RESEARCH_INSPECTION_VERSION = 28
export const RESEARCH_LIMITS = {queries: 3, results: 3, rounds: 2, text: 12000} as const
export interface ResearchSearchOptions {
  readonly query: string
  readonly limit: number
}
export interface ResearchReader {
  readonly search: (options: ResearchSearchOptions) => Promise<KnowledgeIndexSearchResult>
}
export interface ResearchPlanOptions {
  readonly assessment: Assessment
  readonly questions: ReadonlyArray<string>
  readonly queries: ReadonlyArray<string>
  readonly selection: ContextSelection
}
export interface ResearchQueries {
  readonly ok: true
  readonly value: ReadonlyArray<string>
}
export interface ResearchDecision {
  readonly stop?: 'call-limit'
  readonly unreviewed?: ReadonlyArray<AuditQuestion>
  readonly audits?: ReadonlyArray<InquiryAuditRecord>
  readonly proposed: Assessment
  readonly unresolved: ReadonlyArray<string>
  readonly citations: ReadonlyArray<string>
}
export interface ResearchDecisionSuccess {
  readonly ok: true
  readonly value: ResearchDecision
}
export interface ResearchAssessOptions extends ResearchPlanOptions {
  readonly pair: InspectionPair
}
export interface ResearchQuery {
  readonly query: string
  readonly hits: ReadonlyArray<string>
}
export interface ResearchRound {
  readonly questions: ReadonlyArray<string>
  readonly queries: ReadonlyArray<ResearchQuery>
  readonly added: ReadonlyArray<string>
  readonly decision?: ResearchDecision
}
export type ResearchStop =
  | 'call-limit'
  | 'resolved'
  | 'round-limit'
  | 'text-limit'
  | 'no-new-queries'
  | 'no-new-evidence'
export interface ResearchReview {
  readonly budget?: ResearchBudget
  readonly journal?: ResearchJournal
  readonly reused?: ResearchReuse
  readonly initial: Assessment
  readonly rounds: ReadonlyArray<ResearchRound>
  readonly selection: ContextSelection
  readonly unresolved: ReadonlyArray<string>
  readonly stop: ResearchStop
}
export interface ResearchBudget {
  readonly limit: number
  readonly reserved: number
}
export interface QuestionEvidence {
  readonly pointId: string
  readonly contentHash: string
  readonly passage: string
}
export interface QuestionAttempt {
  readonly query: string
  readonly clues: ReadonlyArray<string>
}
export interface ResearchInquiry {
  readonly id: string
  readonly text: string
  readonly confirmed: string
  readonly remaining: string
  readonly evidence: ReadonlyArray<QuestionEvidence>
  readonly attempts: ReadonlyArray<QuestionAttempt>
}
export interface ResearchJournal {
  readonly fingerprint: string
  readonly questions: ReadonlyArray<ResearchInquiry>
}
export interface ResearchReuse {
  readonly added: ReadonlyArray<string>
  readonly decision: ResearchDecision
}
export interface ResearchSuccess {
  readonly ok: true
  readonly value: Assessment
  readonly research: ResearchReview
}
export type ResearchResult = ResearchSuccess | InspectionFailure
export interface RunInspectionResearchOptions {
  readonly linked?: ReadonlyArray<StoredKnowledgePoint>
  readonly pair: InspectionPair
  readonly initial: Assessment
  readonly questions: ReadonlyArray<string>
  readonly points: ReadonlyArray<StoredKnowledgePoint>
  readonly reader: ResearchReader
  readonly planner: (options: ResearchPlanOptions) => Promise<ResearchQueries | InspectionFailure>
  readonly assessor: (
    options: ResearchAssessOptions,
  ) => Promise<ResearchDecisionSuccess | InspectionFailure>
}
const normalizeQuery = (query: string): string =>
  query.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase()
interface ReadResearchOptions {
  readonly reader: ResearchReader
  readonly queries: ReadonlyArray<string>
  readonly snapshot: ReadonlyMap<string, StoredKnowledgePoint>
  readonly seen: ReadonlySet<string>
  readonly texts: ReadonlySet<string>
}
interface ResearchSources {
  readonly ok: true
  readonly points: ReadonlyArray<StoredKnowledgePoint>
  readonly queries: ReadonlyArray<ResearchQuery>
}
const readResearch = async (
  options: ReadResearchOptions,
): Promise<ResearchSources | InspectionFailure> => {
  const points = new Map<string, StoredKnowledgePoint>()
  const texts = new Set(options.texts)
  const queries: ResearchQuery[] = []
  for (const query of options.queries) {
    // Keep both database and embedding work within the sequential per-pair budget.
    // eslint-disable-next-line no-await-in-loop
    const result = await options.reader.search({limit: RESEARCH_LIMITS.results, query})
    if (!result.ok) {
      return {error: {code: `inspection-search-${result.error.code}`}, ok: false}
    }
    if (
      result.value.length > RESEARCH_LIMITS.results ||
      result.value.some(
        (hit) =>
          !Number.isFinite(hit.score) ||
          !isDeepStrictEqual(options.snapshot.get(hit.pointId)?.payload, hit.payload),
      )
    ) {
      return {error: {code: 'inspection-search-source-changed'}, ok: false}
    }
    queries.push({hits: result.value.map((hit) => hit.pointId), query})
    for (const hit of result.value) {
      if (
        hit.payload.status === 'active' &&
        !options.seen.has(hit.pointId) &&
        !texts.has(hit.payload.text) &&
        hit.payload.text.trim() !== ''
      ) {
        points.set(hit.pointId, {payload: hit.payload, pointId: hit.pointId})
        texts.add(hit.payload.text)
      }
    }
  }
  return {ok: true, points: [...points.values()], queries}
}
const validDecision = (
  decision: ResearchDecision,
  pair: InspectionPair,
  selection: ContextSelection,
): boolean => {
  const MAX_CITATIONS = 6
  const unresolved = contextQuestionsSchema.safeParse(decision.unresolved)
  const proposed = parseAssessment({input: decision.proposed, pair})
  const citations = new Set(contextPassages(selection).map(({id}) => id))
  return (
    proposed.ok &&
    unresolved.success &&
    decision.citations.length <= MAX_CITATIONS &&
    new Set(decision.citations).size === decision.citations.length &&
    decision.citations.every((id) => citations.has(id)) &&
    (decision.unresolved.length > 0 || decision.citations.length > 0)
  )
}
interface FindResearchOptions extends ResearchPlanOptions {
  readonly options: RunInspectionResearchOptions
  readonly snapshot: ReadonlyMap<string, StoredKnowledgePoint>
  readonly seen: ReadonlySet<string>
  readonly texts: ReadonlySet<string>
}
const findResearch = async (
  input: FindResearchOptions,
): Promise<ResearchSources | InspectionFailure> => {
  const planned = await input.options.planner(input)
  if (!planned.ok) {
    return planned
  }
  const parsed = contextQuestionsSchema.safeParse(planned.value)
  if (!parsed.success) {
    return {error: {code: 'invalid-inspection-queries'}, ok: false}
  }
  const queries = [...new Set(parsed.data.map(normalizeQuery))].filter(
    (query) => !input.queries.includes(query),
  )
  return readResearch({...input, queries, reader: input.options.reader})
}
interface AssessResearchRoundOptions extends ResearchAssessOptions {
  readonly assessor: RunInspectionResearchOptions['assessor']
}
const assessResearchRound = async (
  options: AssessResearchRoundOptions,
): Promise<ResearchDecisionSuccess | InspectionFailure> => {
  const result = await options.assessor(options)
  if (!result.ok) {
    return result
  }
  if (!validDecision(result.value, options.pair, options.selection)) {
    return {error: {code: 'invalid-inspection-research'}, ok: false}
  }
  const MAX_QUESTION = 300
  const {value} = result
  const unresolved =
    value.proposed.kind === 'uncertain' && value.unresolved.length === 0
      ? [value.proposed.reason.slice(0, MAX_QUESTION)]
      : value.unresolved
  return {ok: true, value: {...value, unresolved}}
}
interface PrepareResearchOptions extends RunInspectionResearchOptions {
  readonly snapshot: ReadonlyMap<string, StoredKnowledgePoint>
  readonly seen: Set<string>
  readonly texts: Set<string>
}
interface PreparedResearch {
  readonly stop?: 'call-limit'
  readonly ok: true
  readonly assessment: Assessment
  readonly questions: ReadonlyArray<string>
  readonly selection: ContextSelection
  readonly reused?: ResearchReuse
}
const prepareResearch = async (
  options: PrepareResearchOptions,
): Promise<PreparedResearch | InspectionFailure> => {
  const linkedTexts = new Set(options.texts)
  const linkedIds = new Set(options.seen)
  const linked = (options.linked ?? []).filter(({payload, pointId}) => {
    if (
      payload.status !== 'active' ||
      linkedIds.has(pointId) ||
      linkedTexts.has(payload.text) ||
      payload.text.trim() === '' ||
      !isDeepStrictEqual(options.snapshot.get(pointId)?.payload, payload)
    ) {
      return false
    }
    linkedIds.add(pointId)
    linkedTexts.add(payload.text)
    return true
  })
  const selection = selectInspectionContext({
    maxTotal: RESEARCH_LIMITS.text,
    points: linked,
    questions: options.questions,
  })
  const selected = new Set(selection.sources.map((source) => source.pointId))
  linked.forEach((point) => {
    if (selected.has(point.pointId)) {
      options.seen.add(point.pointId)
      options.texts.add(point.payload.text)
    }
  })
  if (selection.sources.length === 0) {
    return {assessment: options.initial, ok: true, questions: options.questions, selection}
  }
  const decision = await assessResearchRound({
    assessment: options.initial,
    assessor: options.assessor,
    pair: options.pair,
    queries: [],
    questions: options.questions,
    selection,
  })
  if (!decision.ok && decision.error.code === 'inspection-call-limit') {
    return {
      assessment: options.initial,
      ok: true,
      questions: options.questions,
      selection,
      stop: 'call-limit',
    }
  }
  return decision.ok
    ? {
        assessment: decision.value.proposed,
        ok: true,
        questions: decision.value.unresolved,
        reused: {added: [...selected], decision: decision.value},
        selection,
        ...(decision.value.stop === undefined ? {} : {stop: decision.value.stop}),
      }
    : decision
}
interface ResearchSetup extends PreparedResearch {
  readonly seen: Set<string>
  readonly texts: Set<string>
  readonly snapshot: ReadonlyMap<string, StoredKnowledgePoint>
}
const initializeResearch = async (
  options: RunInspectionResearchOptions,
): Promise<ResearchSetup | InspectionFailure> => {
  const seen = new Set([options.pair.left.pointId, options.pair.right.pointId])
  const texts = new Set([options.pair.left.payload.text, options.pair.right.payload.text])
  const snapshot = new Map(
    options.points
      .filter(
        ({payload}) =>
          payload.repoId === options.pair.left.payload.repoId &&
          payload.workspaceId === options.pair.left.payload.workspaceId,
      )
      .map((point) => [point.pointId, point]),
  )
  const prepared = await prepareResearch({...options, seen, snapshot, texts})
  return prepared.ok ? {...prepared, seen, snapshot, texts} : prepared
}
const executeResearch = async (options: RunInspectionResearchOptions): Promise<ResearchResult> => {
  const rounds: ResearchRound[] = []
  const queries = new Set<string>()
  const prepared = await initializeResearch(options)
  if (!prepared.ok) {
    return prepared
  }
  let {assessment, questions, selection} = prepared
  const {reused, seen, snapshot, texts} = prepared
  const finish = (stop: ResearchStop): ResearchSuccess => ({
    ok: true,
    research: {
      initial: options.initial,
      rounds,
      selection,
      stop,
      unresolved: questions,
      ...(reused === undefined ? {} : {reused}),
    },
    value: resolveContextAssessment({proposed: assessment, unresolved: questions}),
  })
  for (let round = 0; round < RESEARCH_LIMITS.rounds; round += 1) {
    if (prepared.stop !== undefined || questions.length === 0) {
      return finish(prepared.stop ?? 'resolved')
    }
    const used = selection.sources.reduce((total, source) => total + source.text.length, 0)
    if (used >= RESEARCH_LIMITS.text) {
      return finish('text-limit')
    }
    // Each stage depends on the previous evidence and unresolved conditions.
    // eslint-disable-next-line no-await-in-loop
    const found = await findResearch({
      assessment,
      options,
      queries: [...queries],
      questions,
      seen,
      selection,
      snapshot,
      texts,
    })
    if (!found.ok) {
      return found.error.code === 'inspection-call-limit' ? finish('call-limit') : found
    }
    if (found.queries.length === 0) {
      return finish('no-new-queries')
    }
    found.queries.forEach(({query}) => queries.add(query))
    const added = selectInspectionContext({
      maxSources: RESEARCH_LIMITS.queries * RESEARCH_LIMITS.results,
      maxTotal: RESEARCH_LIMITS.text - used,
      points: found.points,
      questions,
    })
    const record: ResearchRound = {
      added: added.sources.map((source) => source.pointId),
      queries: found.queries,
      questions,
    }
    if (added.sources.length === 0) {
      rounds.push(record)
      if (round + 1 === RESEARCH_LIMITS.rounds) {
        return finish('no-new-evidence')
      }
    } else {
      found.points.forEach((source) => {
        seen.add(source.pointId)
        texts.add(source.payload.text)
      })
      selection = {
        eligible: selection.eligible + added.eligible,
        sources: [...selection.sources, ...added.sources],
        truncated: selection.truncated || added.truncated,
      }
      // eslint-disable-next-line no-await-in-loop
      const decision = await assessResearchRound({
        assessment,
        assessor: options.assessor,
        pair: options.pair,
        queries: [...queries],
        questions,
        selection,
      })
      if (!decision.ok) {
        if (decision.error.code === 'inspection-call-limit') {
          rounds.push(record)
          return finish('call-limit')
        }
        return decision
      }
      rounds.push({...record, decision: decision.value})
      assessment = decision.value.proposed
      questions = [...decision.value.unresolved]
      if (decision.value.stop === 'call-limit') {
        return finish('call-limit')
      }
    }
  }
  return finish(
    questions.length === 0
      ? 'resolved'
      : selection.sources.reduce((total, source) => total + source.text.length, 0) >=
          RESEARCH_LIMITS.text
        ? 'text-limit'
        : 'round-limit',
  )
}
/** Investigates unresolved conditions with bounded queries and cumulative evidence; absence never proves contradiction. */
export const runInspectionResearch = async (
  options: RunInspectionResearchOptions,
): Promise<ResearchResult> => {
  const checked = contextQuestionsSchema.safeParse(options.questions)
  if (!checked.success || !parseAssessment({input: options.initial, pair: options.pair}).ok) {
    return {error: {code: 'invalid-inspection-research'}, ok: false}
  }
  try {
    return await executeResearch({...options, questions: checked.data})
  } catch {
    return {error: {code: 'inspection-research-unavailable'}, ok: false}
  }
}
