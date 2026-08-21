import {describe, expect, it} from 'vitest'

import {getTossCallbackAuthorization, getTossMtlsCredentials} from '../environment'

describe('getTossCallbackAuthorization', () => {
  it('should read a Basic callback authorization value', () => {
    expect(
      getTossCallbackAuthorization({POMO_TOSS_CALLBACK_AUTHORIZATION: ' Basic dXNlcjpwYXNz '}),
    ).toBe('Basic dXNlcjpwYXNz')
  })

  it.each([undefined, '', 'Bearer token', 'Basic '])(
    'should reject an invalid callback authorization value',
    (authorization) => {
      expect(() =>
        getTossCallbackAuthorization({POMO_TOSS_CALLBACK_AUTHORIZATION: authorization}),
      ).toThrow('POMO_TOSS_CALLBACK_AUTHORIZATION')
    },
  )
})

describe('getTossMtlsCredentials', () => {
  it('should restore PEM line breaks from environment values', () => {
    expect(
      getTossMtlsCredentials({
        POMO_TOSS_MTLS_CERT: 'CERT\\nBODY',
        POMO_TOSS_MTLS_KEY: 'KEY\\nBODY',
      }),
    ).toEqual({certificate: 'CERT\nBODY', privateKey: 'KEY\nBODY'})
  })

  it.each([
    [{POMO_TOSS_MTLS_CERT: undefined, POMO_TOSS_MTLS_KEY: 'key'}, 'POMO_TOSS_MTLS_CERT'],
    [{POMO_TOSS_MTLS_CERT: 'cert', POMO_TOSS_MTLS_KEY: '  '}, 'POMO_TOSS_MTLS_KEY'],
  ])('should reject missing mTLS credentials', (environment, expectedName) => {
    expect(() => getTossMtlsCredentials(environment)).toThrow(expectedName)
  })
})
