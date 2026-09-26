import {afterEach, expect, it, vi} from 'vitest'
import {auditFlatEvidence} from '../flat'
import {generateInspectionJson} from '../contextual'

vi.mock('../contextual', () => ({generateInspectionJson: vi.fn()}))
afterEach(() => vi.resetAllMocks())
const options = {
  baseUrl: 'http://localhost:11434',
  model: 'test',
  original: {left: 'Policy A.', right: 'Action B.'},
  questions: [
    {
      answer: 'Proposed answer.',
      evidence: [{id: 'q:0', text: 'Policy A covers B.'}],
      id: 'q',
      question: 'Does A cover B?',
    },
  ],
}
const answer = {choice: 'determined', quote: 'Policy A covers B.', reason: 'Explicit scope.'}
it('should map an exact passage to the question evidence without sending proposed answers', async () => {
  vi.mocked(generateInspectionJson).mockResolvedValue(answer)
  expect(await auditFlatEvidence(options)).toEqual({
    ok: true,
    value: [
      {
        evidence: ['q:0'],
        missing: '',
        questionId: 'q',
        reason: answer.reason,
        supported: true,
      },
    ],
  })
  const request = vi.mocked(generateInspectionJson).mock.calls[0][0]
  expect(request.prompt).toContain(
    JSON.stringify({
      evidence: options.questions[0].evidence,
      original: options.original,
      question: options.questions[0].question,
    }),
  )
  expect(request.prompt).not.toContain(options.questions[0].answer)
  expect(request.prompt).not.toContain('"questions"')
})
it('should preserve an unresolved question without truncating its reason', async () => {
  const reason = 'Missing attribution. '.repeat(20)
  vi.mocked(generateInspectionJson).mockResolvedValue({choice: 'undetermined', quote: '', reason})
  expect(await auditFlatEvidence(options)).toEqual({
    ok: true,
    value: [
      {
        evidence: [],
        missing: options.questions[0].question,
        questionId: 'q',
        reason,
        supported: false,
      },
    ],
  })
})
it.each([
  {...answer, quote: 'Policy A.'},
  {...answer, quote: 'invented'},
  {...answer, quote: ''},
  {...answer, choice: ''},
  {...answer, choice: 'undetermined'},
  {...answer, reason: ' '},
  {...answer, reason: 'x'.repeat(1001)},
  {choice: 'determined'},
])('should reject malformed or uncited evidence %#', async (response) => {
  vi.mocked(generateInspectionJson).mockResolvedValue(response)
  expect(await auditFlatEvidence(options)).toEqual({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
})
it('should never map a quotation from a different question', async () => {
  vi.mocked(generateInspectionJson).mockResolvedValue({...answer, quote: 'Other evidence.'})
  const questions = [
    ...options.questions,
    {...options.questions[0], evidence: [{id: 'other:0', text: 'Other evidence.'}], id: 'other'},
  ]
  expect(await auditFlatEvidence({...options, questions})).toEqual({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
  expect(generateInspectionJson).toHaveBeenCalledTimes(1)
})
it('should report transport failure without inventing a finding', async () => {
  vi.mocked(generateInspectionJson).mockRejectedValue(new Error('Offline'))
  expect(await auditFlatEvidence(options)).toEqual({
    error: {code: 'inspection-audit-unavailable'},
    ok: false,
  })
})
