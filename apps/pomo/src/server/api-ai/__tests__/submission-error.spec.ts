/** @vitest-environment node */
import {expect, it} from 'vitest'
import {classifyApiAiSubmissionError} from '../submission-error'

it('should permit fallback after a confirmed temporary rejection', () => {
  expect(
    classifyApiAiSubmissionError({code: 'rate_limit_exceeded', status: 429}, 1000),
  ).toMatchObject({acceptance: 'rejected', fallback: true, retryAt: 31_000})
})

it('should honor the provider retry delay without retrying sooner', () => {
  expect(
    classifyApiAiSubmissionError({headers: new Headers({'retry-after': '90'}), status: 429}, 1000),
  ).toMatchObject({retryAt: 91_000})
})

it('should retain unknown acceptance after transport failure', () => {
  expect(classifyApiAiSubmissionError(new Error('response lost'), 1000)).toMatchObject({
    acceptance: 'unknown',
    fallback: false,
  })
})

it('should not switch providers for invalid user input', () => {
  expect(classifyApiAiSubmissionError({code: 'invalid_request', status: 400}, 1000)).toMatchObject({
    acceptance: 'rejected',
    fallback: false,
  })
})

it('should disable an exhausted provider instead of repeatedly retrying quota errors', () => {
  expect(
    classifyApiAiSubmissionError({code: 'insufficient_quota', status: 429}, 1000),
  ).toMatchObject({acceptance: 'rejected', disabled: true, fallback: true})
})

it('should retain unknown acceptance on an inconclusive server error', () => {
  expect(classifyApiAiSubmissionError({status: 500}, 1000)).toMatchObject({
    acceptance: 'unknown',
    fallback: false,
  })
})
