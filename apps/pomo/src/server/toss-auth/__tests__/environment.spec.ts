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
        POMO_TOSS_MTLS_CERT: '-----BEGIN CERTIFICATE-----\\nCERT BODY\\n-----END CERTIFICATE-----',
        POMO_TOSS_MTLS_KEY: '-----BEGIN PRIVATE KEY-----\\nKEY BODY\\n-----END PRIVATE KEY-----',
      }),
    ).toEqual({
      certificate: '-----BEGIN CERTIFICATE-----\nCERT BODY\n-----END CERTIFICATE-----',
      privateKey: '-----BEGIN PRIVATE KEY-----\nKEY BODY\n-----END PRIVATE KEY-----',
    })
  })

  it('should normalize CRLF PEM values', () => {
    expect(
      getTossMtlsCredentials({
        POMO_TOSS_MTLS_CERT:
          '-----BEGIN CERTIFICATE-----\r\nCERT BODY\r\n-----END CERTIFICATE-----',
        POMO_TOSS_MTLS_KEY:
          '-----BEGIN RSA PRIVATE KEY-----\r\nKEY BODY\r\n-----END RSA PRIVATE KEY-----',
      }),
    ).toEqual({
      certificate: '-----BEGIN CERTIFICATE-----\nCERT BODY\n-----END CERTIFICATE-----',
      privateKey: '-----BEGIN RSA PRIVATE KEY-----\nKEY BODY\n-----END RSA PRIVATE KEY-----',
    })
  })

  it('should reject values without the expected PEM envelope', () => {
    expect(() =>
      getTossMtlsCredentials({
        POMO_TOSS_MTLS_CERT: 'CERT BODY',
        POMO_TOSS_MTLS_KEY: 'KEY BODY',
      }),
    ).toThrow('POMO_TOSS_MTLS_CERT must contain a valid PEM value')
  })

  it.each([
    [
      {
        POMO_TOSS_MTLS_CERT: undefined,
        POMO_TOSS_MTLS_KEY: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----',
      },
      'POMO_TOSS_MTLS_CERT',
    ],
    [
      {
        POMO_TOSS_MTLS_CERT: '-----BEGIN CERTIFICATE-----\nCERT\n-----END CERTIFICATE-----',
        POMO_TOSS_MTLS_KEY: '  ',
      },
      'POMO_TOSS_MTLS_KEY',
    ],
  ])('should reject missing mTLS credentials', (environment, expectedName) => {
    expect(() => getTossMtlsCredentials(environment)).toThrow(expectedName)
  })
})
