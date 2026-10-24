import {z} from 'zod'
import type {InspectionFailure} from './pairs'

export interface AuditEvidence {
  readonly id: string
  readonly text: string
}
export interface AuditQuestion {
  readonly id: string
  readonly question: string
  readonly answer: string
  readonly evidence: ReadonlyArray<AuditEvidence>
}
export interface AuditOriginal {
  readonly left: string
  readonly right: string
}
export interface AuditQuestionsOptions {
  readonly questions: ReadonlyArray<AuditQuestion>
}
export interface InquiryAuditOptions extends AuditQuestionsOptions {
  readonly original: AuditOriginal
}
export interface InquiryAuditFinding {
  readonly questionId: string
  readonly supported: boolean
  readonly evidence: ReadonlyArray<string>
  readonly missing: string
  readonly reason: string
}
export interface InquiryAuditSuccess {
  readonly ok: true
  readonly value: ReadonlyArray<InquiryAuditFinding>
  readonly checks?: InquiryAuditChecks
}
export interface InquiryAuditChecks {
  readonly evidence: ReadonlyArray<InquiryAuditFinding>
  readonly answers: ReadonlyArray<InquiryAuditFinding>
}
export interface InquiryAuditRecordChecks {
  readonly evidence: InquiryAuditFinding
  readonly answers: InquiryAuditFinding
}
export interface InquiryAuditRecord extends InquiryAuditFinding {
  readonly answer: string
  readonly question: string
  readonly sources: ReadonlyArray<AuditEvidence>
  readonly checks?: InquiryAuditRecordChecks
}
export type InquiryAuditor = (
  options: InquiryAuditOptions,
) => Promise<InquiryAuditSuccess | InspectionFailure>
/** Constrains each audit to the supplied questions and cited evidence. */
export const createAuditSchema = (options: AuditQuestionsOptions) => {
  const MAX_MISSING = 300
  const MAX_REASON = 1000
  const ids = options.questions.map((question) => question.id)
  const evidence = options.questions.flatMap((question) =>
    question.evidence.map((entry) => entry.id),
  )
  const references = z.array(z.enum(evidence)).max(evidence.length)
  const finding = z
    .object({
      evidence: references,
      questionId: z.enum(ids),
      reason: z.string().min(1).max(MAX_REASON),
    })
    .strict()
  return z
    .object({
      findings: z
        .array(
          z.discriminatedUnion('supported', [
            finding.extend({
              evidence: references.min(1),
              missing: z.literal(''),
              supported: z.literal(true),
            }),
            finding.extend({
              missing: z.string().trim().min(1).max(MAX_MISSING),
              supported: z.literal(false),
            }),
          ]),
        )
        .length(ids.length),
    })
    .strict()
}
export interface ParseInquiryAuditOptions extends AuditQuestionsOptions {
  readonly input: unknown
  readonly checks?: InquiryAuditChecks
}
/** Rejects missing questions, cross-question citations and inconsistent audit conclusions. */
export const parseInquiryAudit = (
  options: ParseInquiryAuditOptions,
): InquiryAuditSuccess | InspectionFailure => {
  const parsed = createAuditSchema(options).safeParse({findings: options.input})
  if (!parsed.success) {
    return {error: {code: 'invalid-inquiry-audit'}, ok: false}
  }
  const {findings} = parsed.data
  if (
    new Set(findings.map((finding) => finding.questionId)).size !== options.questions.length ||
    findings.some((finding) => {
      const question = options.questions.find((entry) => entry.id === finding.questionId)
      return (
        question === undefined ||
        finding.reason.trim() === '' ||
        new Set(finding.evidence).size !== finding.evidence.length ||
        finding.evidence.some((id) => !question.evidence.some((entry) => entry.id === id))
      )
    })
  ) {
    return {error: {code: 'invalid-inquiry-audit'}, ok: false}
  }
  if (options.checks === undefined) {
    return {ok: true, value: findings}
  }
  const evidence = parseInquiryAudit({input: options.checks.evidence, questions: options.questions})
  if (!evidence.ok) {
    return evidence
  }
  const answers = parseInquiryAudit({input: options.checks.answers, questions: options.questions})
  if (!answers.ok) {
    return answers
  }
  return {
    checks: {answers: answers.value, evidence: evidence.value},
    ok: true,
    value: answers.value.map((answer) => {
      const finding = evidence.value.find((entry) => entry.questionId === answer.questionId)!
      return finding.supported ? answer : finding
    }),
  }
}
