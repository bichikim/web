import {expect, it} from 'vitest'
import {createAuditSchema, parseInquiryAudit} from '../audit'

const questions = [
  {
    answer: 'A is covered.',
    evidence: [{id: 'q:0', text: 'A is included.'}],
    id: 'q',
    question: 'Is A covered?',
  },
]
const supported = {
  evidence: ['q:0'],
  missing: '',
  questionId: 'q',
  reason: 'Explicit scope.',
  supported: true,
}
it.each([
  {...supported, missing: '', supported: false},
  {...supported, evidence: []},
])('should constrain contradictory findings in the generation schema: %o', (finding) => {
  expect(createAuditSchema({questions}).safeParse({findings: [finding]}).success).toBe(false)
})
it.each([
  {answers: true, evidence: false},
  {answers: false, evidence: true},
  {answers: true, evidence: true},
])('should require both validated checks to support an answer: %o', (states) => {
  const finding = (accept: boolean) => ({
    ...supported,
    missing: accept ? '' : 'Missing applicability.',
    supported: accept,
  })
  const checks = {answers: [finding(states.answers)], evidence: [finding(states.evidence)]}
  expect(parseInquiryAudit({checks, input: [supported], questions})).toEqual({
    checks,
    ok: true,
    value: [finding(states.evidence && states.answers)],
  })
})
it.each(['evidence', 'answers'] as const)('should validate %s check IDs and citations', (stage) => {
  const checks = {
    answers: [supported],
    evidence: [supported],
    [stage]: [{...supported, evidence: ['unknown']}],
  }
  expect(parseInquiryAudit({checks, input: [supported], questions})).toEqual({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
})
it('should accept supported and rejected findings without changing their question IDs', () => {
  expect(parseInquiryAudit({input: [supported], questions})).toEqual({ok: true, value: [supported]})
  const rejected = {...supported, evidence: [], missing: 'Applicability?', supported: false}
  expect(parseInquiryAudit({input: [rejected], questions})).toEqual({ok: true, value: [rejected]})
})
it('should combine reordered checks by question ID without mixing evidence', () => {
  const other = {...questions[0], evidence: [{id: 'r:0', text: 'R is included.'}], id: 'r'}
  const accepted = {...supported, evidence: ['r:0'], questionId: 'r'}
  const rejected = {...supported, evidence: [], missing: 'Applicability?', supported: false}
  const checks = {answers: [accepted, supported], evidence: [rejected, accepted]}
  expect(
    parseInquiryAudit({checks, input: [supported, accepted], questions: [...questions, other]}),
  ).toEqual({
    checks,
    ok: true,
    value: [accepted, rejected],
  })
})
it.each(
  [
    [],
    [supported, supported],
    [{...supported, questionId: 'unknown'}],
    [{...supported, evidence: []}],
    [{...supported, evidence: ['invented']}],
    [{...supported, missing: 'Still missing'}],
    [{...supported, supported: false}],
    [{...supported, reason: ''}],
    [{...supported, extra: true}],
  ].map((input) => ({input})),
)('should reject invalid audit findings %#', ({input}) => {
  expect(parseInquiryAudit({input, questions})).toEqual({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
})
it('should reject repeated questions and citations belonging to another question', () => {
  const other = {...questions[0], evidence: [{id: 'r:0', text: 'Another source.'}], id: 'r'}
  expect(
    parseInquiryAudit({input: [supported, supported], questions: [...questions, other]}).ok,
  ).toBe(false)
  expect(
    parseInquiryAudit({
      input: [supported, {...supported, questionId: 'r'}],
      questions: [...questions, other],
    }).ok,
  ).toBe(false)
})
