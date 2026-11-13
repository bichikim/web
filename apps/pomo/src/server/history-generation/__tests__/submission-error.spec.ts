/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {HistorySubmissionError} from '../submission-error'

it('should use a stable message for a non-Error submission failure', () => {
  expect(new HistorySubmissionError('unknown', null).message).toBe(
    'Unknown OpenAI submission error',
  )
})

it.each(['', ' ', 'submission detail'])(
  'should preserve an Error message %j and its cause in either acceptance state',
  (message) => {
    const cause = new TypeError(message)
    for (const acceptance of ['rejected', 'unknown'] as const) {
      const error = new HistorySubmissionError(acceptance, cause)
      expect(error.message).toBe(message)
      expect(error.cause).toBe(cause)
      expect(error.acceptance).toBe(acceptance)
      expect(error.name).toBe('HistorySubmissionError')
      expect(error).toBeInstanceOf(Error)
    }
  },
)

it.each([undefined, null, 'provider detail', 0, false])(
  'should retain a non-Error cause %j without using it as the diagnostic message',
  (cause) => {
    const error = new HistorySubmissionError('unknown', cause)
    expect(error.message).toBe('Unknown OpenAI submission error')
    expect(error.cause).toBe(cause)
    expect(error.acceptance).toBe('unknown')
  },
)

it('should ignore a message getter on a cause outside the Error contract', () => {
  const message = vi.fn(() => {
    throw new Error('Should not inspect this cause')
  })
  const cause = Object.defineProperty({}, 'message', {get: message})
  const error = new HistorySubmissionError('rejected', cause)
  expect(error.message).toBe('Unknown OpenAI submission error')
  expect(error.cause).toBe(cause)
  expect(message).not.toHaveBeenCalled()
})

it('should read an Error message once before retaining the original cause', () => {
  const message = vi.fn(() => 'provider detail')
  const cause = Object.defineProperty(new Error(), 'message', {get: message})
  const error = new HistorySubmissionError('rejected', cause)
  expect(error.message).toBe('provider detail')
  expect(error.cause).toBe(cause)
  expect(message).toHaveBeenCalledOnce()
})
