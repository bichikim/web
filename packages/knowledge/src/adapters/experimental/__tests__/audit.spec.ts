import {afterEach, expect, it, vi} from 'vitest'
import {auditInquiryAnswers} from '../audit'
import {generateInspectionJson} from '../contextual'

vi.mock('../contextual', () => ({generateInspectionJson: vi.fn()}))
afterEach(() => vi.resetAllMocks())
const options = {
  baseUrl: 'http://localhost:11434',
  model: 'test',
  original: {left: 'Policy A.', right: 'Action B.'},
  questions: [
    {
      answer: 'B is covered.',
      evidence: [{id: 'q:0', text: 'Policy A covers B.'}],
      id: 'q',
      question: 'Does A cover B?',
    },
  ],
}
const finding = {
  evidence: ['q:0'],
  missing: '',
  questionId: 'q',
  reason: 'Explicit scope.',
  supported: true,
}
it('should audit only the supplied questions and evidence with a constrained schema', async () => {
  vi.mocked(generateInspectionJson).mockResolvedValue({findings: [finding]})
  expect(await auditInquiryAnswers(options)).toEqual({ok: true, value: [finding]})
  expect(generateInspectionJson).toHaveBeenCalledTimes(1)
  expect(generateInspectionJson).toHaveBeenCalledWith(
    expect.objectContaining({
      baseUrl: options.baseUrl,
      model: 'test',
      prompt: expect.stringContaining(
        JSON.stringify({original: options.original, questions: options.questions}),
      ),
    }),
  )
})
it.each([
  {findings: []},
  {findings: [{...finding, evidence: ['invented']}]},
  {findings: [{...finding, supported: false}]},
])('should report invalid audit output %#', async (response) => {
  vi.mocked(generateInspectionJson).mockResolvedValue(response)
  expect(await auditInquiryAnswers(options)).toEqual({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
})
it('should report an unavailable auditor without creating a missing condition', async () => {
  vi.mocked(generateInspectionJson).mockRejectedValue(new Error('Timeout'))
  expect(await auditInquiryAnswers(options)).toEqual({
    error: {code: 'inspection-audit-unavailable'},
    ok: false,
  })
})
it.each([false, true])(
  'should independently check evidence before accepting an answer: %s',
  async (supported) => {
    const evidence = {...finding, missing: supported ? '' : 'Missing applicability.', supported}
    vi.mocked(generateInspectionJson)
      .mockResolvedValueOnce({findings: [evidence]})
      .mockResolvedValueOnce({findings: [finding]})
    expect(await auditInquiryAnswers({...options, evidenceFirst: true})).toEqual({
      checks: {answers: [finding], evidence: [evidence]},
      ok: true,
      value: [supported ? finding : evidence],
    })
    const calls = vi.mocked(generateInspectionJson).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0][0].prompt).not.toContain(options.questions[0].answer)
    expect(calls[0][0].prompt).toContain(options.questions[0].question)
    expect(calls[0][0].prompt).toContain(options.questions[0].evidence[0].text)
    expect(calls[1][0].prompt).toContain(options.questions[0].answer)
  },
)
it('should reject an incorrect answer even when the evidence establishes an answer', async () => {
  const answer = {...finding, missing: 'Incorrect answer.', supported: false}
  vi.mocked(generateInspectionJson)
    .mockResolvedValueOnce({findings: [finding]})
    .mockResolvedValueOnce({findings: [answer]})
  expect(await auditInquiryAnswers({...options, evidenceFirst: true})).toMatchObject({
    checks: {answers: [answer], evidence: [finding]},
    ok: true,
    value: [answer],
  })
})
it('should stop on malformed independent evidence output', async () => {
  vi.mocked(generateInspectionJson).mockResolvedValueOnce({findings: []})
  expect(await auditInquiryAnswers({...options, evidenceFirst: true})).toEqual({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
  expect(generateInspectionJson).toHaveBeenCalledTimes(1)
})
it('should reject repeated independent evidence IDs before checking the answer', async () => {
  const questions = [
    {
      ...options.questions[0],
      evidence: [...options.questions[0].evidence, {id: 'q:1', text: 'Additional scope.'}],
    },
  ]
  vi.mocked(generateInspectionJson).mockResolvedValueOnce({
    findings: [{...finding, evidence: ['q:0', 'q:0']}],
  })
  expect(await auditInquiryAnswers({...options, evidenceFirst: true, questions})).toEqual({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
  expect(generateInspectionJson).toHaveBeenCalledTimes(1)
})
it('should propagate answer-check failure even after independent rejection', async () => {
  vi.mocked(generateInspectionJson)
    .mockResolvedValueOnce({findings: [{...finding, missing: 'Applicability?', supported: false}]})
    .mockRejectedValueOnce(new Error('Timeout'))
  expect(await auditInquiryAnswers({...options, evidenceFirst: true})).toEqual({
    error: {code: 'inspection-audit-unavailable'},
    ok: false,
  })
  expect(generateInspectionJson).toHaveBeenCalledTimes(2)
})
it('should propagate independent evidence transport failure without an answer check', async () => {
  vi.mocked(generateInspectionJson).mockRejectedValueOnce(new Error('Timeout'))
  expect(await auditInquiryAnswers({...options, evidenceFirst: true})).toEqual({
    error: {code: 'inspection-audit-unavailable'},
    ok: false,
  })
  expect(generateInspectionJson).toHaveBeenCalledTimes(1)
})
it('should reject unsupported independent citations before an answer check', async () => {
  vi.mocked(generateInspectionJson).mockResolvedValueOnce({findings: [{...finding, evidence: []}]})
  expect(await auditInquiryAnswers({...options, evidenceFirst: true})).toEqual({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
  expect(generateInspectionJson).toHaveBeenCalledTimes(1)
})
