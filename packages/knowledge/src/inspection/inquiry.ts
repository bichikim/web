import {createHash} from 'node:crypto'
import {z} from 'zod'
import type {StoredKnowledgePoint} from '../indexing/store'
import {
  type AuditQuestion,
  type InquiryAuditor,
  type InquiryAuditRecord,
  parseInquiryAudit,
} from './audit'
import {contextPassages, contextQuestionsSchema, type ContextSelection} from './context'
import {
  type Assessment,
  type InspectionFailure,
  type InspectionPair,
  parseAssessment,
} from './pairs'
import {
  type QuestionEvidence,
  type ResearchAssessOptions,
  type ResearchDecisionSuccess,
  type ResearchInquiry,
  type ResearchJournal,
  type ResearchPlanOptions,
  type ResearchQueries,
  type ResearchReader,
  type ResearchReview,
  type ResearchSuccess,
  runInspectionResearch,
} from './research'

const MAX_QUESTIONS = 3
const MAX_ATTEMPTS = 6
const MAX_CITATIONS = 6
const MAX_QUESTION = 300
const MAX_FINDING = 1000
const MAX_PASSAGE = 800
const normalize = (value: string): string =>
  value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase()
const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
const identifier = z.string().regex(/^[a-f0-9]{64}$/u)
const evidenceSchema = z
  .object({
    contentHash: z.string().min(1),
    passage: z.string().min(1).max(MAX_PASSAGE),
    pointId: z.string().min(1),
  })
  .strict()
export const researchJournalSchema = z
  .object({
    fingerprint: identifier,
    questions: z
      .array(
        z
          .object({
            attempts: z
              .array(
                z
                  .object({
                    clues: z.array(identifier).max(MAX_CITATIONS),
                    query: z.string().min(1).max(MAX_QUESTION),
                  })
                  .strict(),
              )
              .max(MAX_ATTEMPTS),
            confirmed: z.string().max(MAX_FINDING),
            evidence: z.array(evidenceSchema).max(MAX_CITATIONS),
            id: identifier,
            remaining: z.string().max(MAX_QUESTION),
            text: z.string().min(1).max(MAX_QUESTION),
          })
          .strict(),
      )
      .max(MAX_QUESTIONS),
  })
  .strict()
  .refine(
    (record) =>
      new Set(record.questions.map((question) => question.id)).size === record.questions.length &&
      record.questions.every(
        (question) =>
          question.id === hash(normalize(question.text)) &&
          (question.confirmed.trim() === '' || question.evidence.length > 0) &&
          (question.remaining.trim() !== '' ||
            (question.confirmed.trim() !== '' && question.evidence.length > 0)),
      ),
  )

export interface InquiryPlanOptions extends ResearchPlanOptions {
  readonly inquiries: ReadonlyArray<ResearchInquiry>
}
export interface InquiryAssessOptions extends ResearchAssessOptions {
  readonly inquiries: ReadonlyArray<ResearchInquiry>
}
export interface InquiryQuery {
  readonly questionId: string
  readonly query: string
}
export interface InquiryPlans {
  readonly ok: true
  readonly value: ReadonlyArray<InquiryQuery>
}
export interface InquiryFinding {
  readonly questionId: string
  readonly confirmed: string
  readonly remaining: string
  readonly citations: ReadonlyArray<string>
}
export interface InquiryDecisionSuccess {
  readonly ok: true
  readonly value: {
    readonly proposed: Assessment
    readonly findings: ReadonlyArray<InquiryFinding>
  }
}
export interface RunInquiryResearchOptions {
  readonly auditor?: InquiryAuditor
  readonly history?: ResearchJournal
  readonly linked?: ReadonlyArray<StoredKnowledgePoint>
  readonly pair: InspectionPair
  readonly points: ReadonlyArray<StoredKnowledgePoint>
  readonly initial: Assessment
  readonly questions: ReadonlyArray<string>
  readonly reader: ResearchReader
  readonly planner: (options: InquiryPlanOptions) => Promise<InquiryPlans | InspectionFailure>
  readonly assessor: (
    options: InquiryAssessOptions,
  ) => Promise<InquiryDecisionSuccess | InspectionFailure>
}
export interface InquiryReview extends ResearchReview {
  readonly journal: ResearchJournal
}
export interface InquirySuccess extends ResearchSuccess {
  readonly research: InquiryReview
}
export type InquiryResult = InquirySuccess | InspectionFailure
const fingerprint = (options: RunInquiryResearchOptions): string =>
  hash([
    [options.pair.left.pointId, options.pair.right.pointId].toSorted(),
    options.points
      .filter(
        ({payload}) =>
          payload.repoId === options.pair.left.payload.repoId &&
          payload.workspaceId === options.pair.left.payload.workspaceId,
      )
      .toSorted((left, right) => left.pointId.localeCompare(right.pointId))
      .map(({payload, pointId}) => [
        pointId,
        payload.repoId,
        payload.workspaceId,
        payload.docId,
        payload.unitId,
        payload.contentHash,
        payload.status,
        payload.title,
        payload.text,
      ]),
    [options.pair.left, options.pair.right]
      .toSorted((left, right) => left.pointId.localeCompare(right.pointId))
      .map(({payload}) => [payload.repoId, payload.workspaceId, payload.contentHash, payload.text]),
  ])
const clueKey = (evidence: QuestionEvidence): string =>
  hash([evidence.pointId, evidence.contentHash, evidence.passage])
const eligible = (question: ResearchInquiry): boolean => {
  if (question.remaining === '' || question.attempts.length >= MAX_ATTEMPTS) {
    return false
  }
  const known = new Set(question.attempts.flatMap((attempt) => attempt.clues))
  const MAX_INITIAL_ATTEMPTS = 2
  return (
    question.attempts.length < MAX_INITIAL_ATTEMPTS ||
    question.evidence.some((source) => !known.has(clueKey(source)))
  )
}
const prepareJournal = (options: RunInquiryResearchOptions): ResearchJournal => {
  const current = fingerprint(options)
  const questions =
    options.questions.length === 0 && (options.linked?.length ?? 0) > 0
      ? [
          'Do the supplemental sources change the applicability or compatibility of these requirements?',
        ]
      : options.questions
  if (options.history !== undefined) {
    const saved = researchJournalSchema.parse(options.history)
    if (saved.fingerprint === current && (saved.questions.length > 0 || questions.length === 0)) {
      const valid = saved.questions.every((question) =>
        question.evidence.every((evidence) =>
          options.points.some(
            ({pointId, payload}) =>
              pointId === evidence.pointId &&
              payload.contentHash === evidence.contentHash &&
              payload.text.includes(evidence.passage) &&
              payload.repoId === options.pair.left.payload.repoId &&
              payload.workspaceId === options.pair.left.payload.workspaceId &&
              payload.status === 'active',
          ),
        ),
      )
      if (!valid) {
        throw new Error('invalid-inquiry-history')
      }
      return saved
    }
  }
  return {
    fingerprint: current,
    questions: [...new Set(questions.map(normalize))].map((text) => {
      const original = questions.find((question) => normalize(question) === text) ?? text
      return {
        attempts: [],
        confirmed: '',
        evidence: [],
        id: hash(text),
        remaining: original,
        text: original,
      }
    }),
  }
}
interface InquiryState {
  journal: ResearchJournal
  readonly pending: Map<string, InquiryQuery>
}
const planSchema = z
  .array(
    z.object({query: z.string().trim().min(1).max(MAX_QUESTION), questionId: identifier}).strict(),
  )
  .max(MAX_QUESTIONS)
const planQueries = async (
  options: RunInquiryResearchOptions,
  state: InquiryState,
  input: ResearchPlanOptions,
): Promise<ResearchQueries | InspectionFailure> => {
  const inquiries = state.journal.questions.filter(eligible)
  if (inquiries.length === 0) {
    return {ok: true, value: []}
  }
  const result = await options.planner({...input, inquiries})
  if (!result.ok) {
    return result
  }
  const parsed = planSchema.safeParse(result.value)
  if (
    !parsed.success ||
    new Set(parsed.data.map((question) => question.questionId)).size !== parsed.data.length ||
    parsed.data.some((question) => !inquiries.some((inquiry) => inquiry.id === question.questionId))
  ) {
    return {error: {code: 'invalid-inquiry-queries'}, ok: false}
  }
  const plans = parsed.data
    .map((plan) => ({...plan, query: normalize(plan.query)}))
    .filter(
      (plan) =>
        !inquiries
          .find((question) => question.id === plan.questionId)
          ?.attempts.some((attempt) => normalize(attempt.query) === plan.query),
    )
  if (new Set(plans.map((plan) => plan.query)).size !== plans.length) {
    return {error: {code: 'invalid-inquiry-queries'}, ok: false}
  }
  state.pending.clear()
  plans.forEach((plan) => state.pending.set(plan.query, plan))
  return {ok: true, value: plans.map((plan) => plan.query)}
}
const findingSchema = z
  .array(
    z
      .object({
        citations: z.array(z.string()).max(MAX_CITATIONS),
        confirmed: z.string().trim().max(MAX_FINDING),
        questionId: identifier,
        remaining: z.string().trim().max(MAX_QUESTION),
      })
      .strict(),
  )
  .max(MAX_QUESTIONS)
const passagesById = (selection: ContextSelection): ReadonlyMap<string, QuestionEvidence> => {
  const result = new Map<string, QuestionEvidence>()
  const passages = contextPassages(selection)
  selection.sources.forEach((source, index) => {
    passages
      .filter((p) => p.id.startsWith(`context-${index + 1}-`))
      .forEach((p) =>
        result.set(p.id, {
          contentHash: source.contentHash,
          passage: p.text,
          pointId: source.pointId,
        }),
      )
  })
  return result
}
const assessQuestions = async (
  options: RunInquiryResearchOptions,
  state: InquiryState,
  input: ResearchAssessOptions,
): Promise<ResearchDecisionSuccess | InspectionFailure> => {
  const result = await options.assessor({...input, inquiries: state.journal.questions})
  if (!result.ok) {
    return result
  }
  const findings = findingSchema.safeParse(result.value.findings)
  const sources = passagesById(input.selection)
  const failure = {error: {code: 'invalid-inquiry-findings'}, ok: false} as const
  if (
    !findings.success ||
    !parseAssessment({input: result.value.proposed, pair: options.pair}).ok
  ) {
    return failure
  }
  let values = findings.data
  if (
    values.length !== state.journal.questions.length ||
    new Set(values.map((finding) => finding.questionId)).size !== values.length ||
    values.some(
      (finding) =>
        !state.journal.questions.some((question) => question.id === finding.questionId) ||
        new Set(finding.citations).size !== finding.citations.length ||
        finding.citations.some((id) => !sources.has(id)) ||
        (finding.confirmed !== '' && finding.citations.length === 0) ||
        (finding.remaining === '' && (finding.confirmed === '' || finding.citations.length === 0)),
    )
  ) {
    return failure
  }
  const citations = [...new Set(values.flatMap((finding) => finding.citations))]
  let unresolved = [...new Set(values.map((finding) => finding.remaining).filter(Boolean))]
  if (
    citations.length > MAX_CITATIONS ||
    (result.value.proposed.kind === 'uncertain' && unresolved.length === 0)
  ) {
    return failure
  }
  let audits: ReadonlyArray<InquiryAuditRecord> | undefined
  let unreviewed: ReadonlyArray<AuditQuestion> | undefined
  if (options.auditor !== undefined && unresolved.length === 0 && values.length > 0) {
    const questions = values.map((finding) => ({
      answer: finding.confirmed,
      evidence: finding.citations.map((id, index) => ({
        id: `${finding.questionId}:${index}`,
        text: sources.get(id)!.passage,
      })),
      id: finding.questionId,
      question: state.journal.questions.find((question) => question.id === finding.questionId)!
        .text,
    }))
    const reviewed = await options.auditor({
      original: {left: options.pair.left.payload.text, right: options.pair.right.payload.text},
      questions,
    })
    if (!reviewed.ok && reviewed.error.code === 'inspection-call-limit') {
      unreviewed = questions
      values = values.map((finding) => ({
        ...finding,
        confirmed: '',
        remaining: questions.find((question) => question.id === finding.questionId)!.question,
      }))
    } else {
      if (!reviewed.ok) {
        return reviewed
      }
      const checked = parseInquiryAudit({checks: reviewed.checks, input: reviewed.value, questions})
      if (!checked.ok) {
        return checked
      }
      audits = checked.value.map((audit) => {
        const question = questions.find((entry) => entry.id === audit.questionId)!
        const evidenceCheck = checked.checks?.evidence.find(
          (entry) => entry.questionId === audit.questionId,
        )
        const answerCheck = checked.checks?.answers.find(
          (entry) => entry.questionId === audit.questionId,
        )
        const checks =
          evidenceCheck === undefined || answerCheck === undefined
            ? undefined
            : {answers: answerCheck, evidence: evidenceCheck}
        return {
          ...audit,
          answer: question.answer,
          question: question.question,
          sources: question.evidence,
          ...(checks === undefined ? {} : {checks}),
        }
      })
      values = values.map((finding) => {
        const audit = audits!.find((entry) => entry.questionId === finding.questionId)!
        return audit.supported
          ? finding
          : {...finding, confirmed: '', remaining: audit.missing.trim()}
      })
    }
    unresolved = [...new Set(values.map((finding) => finding.remaining).filter(Boolean))]
  }
  state.journal = {
    ...state.journal,
    questions: state.journal.questions.map((question) => {
      const finding = values.find((finding) => finding.questionId === question.id)
      if (finding === undefined) {
        throw new Error('Missing finding')
      }
      const evidence = finding.citations.flatMap((id) => {
        const source = sources.get(id)
        return source === undefined ? [] : [source]
      })
      return {...question, confirmed: finding.confirmed, evidence, remaining: finding.remaining}
    }),
  }
  return {
    ok: true,
    value: {
      citations,
      proposed: result.value.proposed,
      unresolved,
      ...(audits === undefined ? {} : {audits}),
      ...(unreviewed === undefined ? {} : {stop: 'call-limit', unreviewed}),
    },
  }
}
/** Allows one alternate initial query, then requires fresh cited clues within the persistent question budget. */
export const runInquiryResearch = async (
  options: RunInquiryResearchOptions,
): Promise<InquiryResult> => {
  if (!contextQuestionsSchema.safeParse(options.questions).success) {
    return {error: {code: 'invalid-inquiry-questions'}, ok: false}
  }
  try {
    const state: InquiryState = {journal: prepareJournal(options), pending: new Map()}
    const result = await runInspectionResearch({
      ...options,
      assessor: (input) => assessQuestions(options, state, input),
      planner: (input) => planQueries(options, state, input),
      questions: state.journal.questions.map((question) => question.text),
      reader: {
        search: async (input) => {
          const plan = state.pending.get(input.query)
          if (plan === undefined) {
            return {
              error: {code: 'invalid-index-response', detail: 'Missing question', retryable: false},
              ok: false,
            }
          }
          const found = await options.reader.search(input)
          if (found.ok) {
            state.journal = {
              ...state.journal,
              questions: state.journal.questions.map((question) =>
                question.id === plan.questionId
                  ? {
                      ...question,
                      attempts: [
                        ...question.attempts,
                        {clues: question.evidence.map(clueKey), query: input.query},
                      ],
                    }
                  : question,
              ),
            }
          }
          return found
        },
      },
    })
    return result.ok ? {...result, research: {...result.research, journal: state.journal}} : result
  } catch {
    return {error: {code: 'inquiry-research-unavailable'}, ok: false}
  }
}
