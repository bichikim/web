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

it.each([
  '1e2',
  '0x10',
  '1.5',
  '+10',
  '-1',
  '',
  '   ',
  'Nov 2099',
  'Sun, 31 Feb 2099 08:49:37 GMT',
  'Sun Feb 31 08:49:37 2099',
  'Sun, 06 Nov 2099 24:00:00 GMT',
  'Sun, 06 Nov 2099',
  '1000000000000000000000000000000',
  '9'.repeat(308),
])('should use the default delay for invalid numeric Retry-After %j', (header) => {
  expect(
    classifyApiAiSubmissionError(
      {headers: new Headers({'Retry-After': header}), status: 429},
      1000,
    ),
  ).toMatchObject({acceptance: 'rejected', fallback: true, retryAt: 31_000})
})

it.each([
  ['0', 1000],
  ['0002', 3000],
  [' 90 ', 91_000],
])('should preserve decimal Retry-After %j including zero', (header, retryAt) => {
  expect(
    classifyApiAiSubmissionError(
      {headers: new Headers({'Retry-After': header}), status: 429},
      1000,
    ),
  ).toMatchObject({retryAt})
})

it.each([
  'Sun, 06 Nov 1994 08:49:37 GMT',
  'Sunday, 06-Nov-94 08:49:37 GMT',
  'Sun Nov  6 08:49:37 1994',
  'Sun Nov 06 08:49:37 1994',
])('should preserve HTTP-date Retry-After %j and clamp elapsed dates', (header) => {
  const headers = new Headers({'Retry-After': header})
  const retryAt = Date.UTC(1994, 10, 6, 8, 49, 37)
  expect(classifyApiAiSubmissionError({headers, status: 429}, 1000)).toMatchObject({retryAt})
  expect(classifyApiAiSubmissionError({headers, status: 429}, retryAt + 1000)).toMatchObject({
    retryAt: retryAt + 1000,
  })
})

it.each([
  'Thu, 31 Dec 2026 23:59:60 GMT',
  'Thursday, 31-Dec-26 23:59:60 GMT',
  'Thu Dec 31 23:59:60 2026',
])('should preserve leap-second Retry-After %j without shortening the delay', (header) => {
  const headers = new Headers({'Retry-After': header})
  const retryAt = Date.UTC(2027, 0, 1)
  expect(classifyApiAiSubmissionError({headers, status: 429}, 1000)).toMatchObject({retryAt})
  expect(classifyApiAiSubmissionError({headers, status: 429}, retryAt + 1000)).toMatchObject({
    retryAt: retryAt + 1000,
  })
})
