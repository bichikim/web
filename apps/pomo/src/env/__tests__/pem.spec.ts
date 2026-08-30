import {describe, expect, it} from 'vitest'

import {pemSchema} from '../pem'

const certSchema = pemSchema('POMO_TOSS_MTLS_CERT', ['CERTIFICATE'])
const keySchema = pemSchema('POMO_TOSS_MTLS_KEY', [
  'PRIVATE KEY',
  'RSA PRIVATE KEY',
  'EC PRIVATE KEY',
])

describe('pemSchema', () => {
  it('should restore PEM line breaks from environment values', () => {
    expect(
      certSchema.parse('-----BEGIN CERTIFICATE-----\\nCERT BODY\\n-----END CERTIFICATE-----'),
    ).toBe('-----BEGIN CERTIFICATE-----\nCERT BODY\n-----END CERTIFICATE-----')
    expect(
      keySchema.parse('-----BEGIN PRIVATE KEY-----\\nKEY BODY\\n-----END PRIVATE KEY-----'),
    ).toBe('-----BEGIN PRIVATE KEY-----\nKEY BODY\n-----END PRIVATE KEY-----')
  })

  it('should normalize CRLF PEM values', () => {
    expect(
      certSchema.parse('-----BEGIN CERTIFICATE-----\r\nCERT BODY\r\n-----END CERTIFICATE-----'),
    ).toBe('-----BEGIN CERTIFICATE-----\nCERT BODY\n-----END CERTIFICATE-----')
    expect(
      keySchema.parse(
        '-----BEGIN RSA PRIVATE KEY-----\r\nKEY BODY\r\n-----END RSA PRIVATE KEY-----',
      ),
    ).toBe('-----BEGIN RSA PRIVATE KEY-----\nKEY BODY\n-----END RSA PRIVATE KEY-----')
  })

  it('should reject values without the expected PEM envelope', () => {
    expect(() => certSchema.parse('CERT BODY')).toThrow(
      'POMO_TOSS_MTLS_CERT must contain a valid PEM value',
    )
  })

  it('should reject a missing certificate', () => {
    expect(() => certSchema.parse('')).toThrow('POMO_TOSS_MTLS_CERT')
  })

  it('should reject a missing private key', () => {
    expect(() => keySchema.parse('  ')).toThrow('POMO_TOSS_MTLS_KEY')
  })

  it('should accept an EC private key envelope', () => {
    expect(
      keySchema.parse('-----BEGIN EC PRIVATE KEY-----\nKEY BODY\n-----END EC PRIVATE KEY-----'),
    ).toBe('-----BEGIN EC PRIVATE KEY-----\nKEY BODY\n-----END EC PRIVATE KEY-----')
  })
})
