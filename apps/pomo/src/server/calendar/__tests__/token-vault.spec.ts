import {describe, expect, it} from 'vitest'

import {createTokenVault} from '../token-vault'

describe('createTokenVault', () => {
  const key = Buffer.alloc(32, 7).toString('base64')

  it('should encrypt and authenticate token data with a different nonce each time', () => {
    const vault = createTokenVault(key)
    const tokens = {
      accessToken: 'access-secret',
      expiresAt: '2026-09-04T11:30:00.000Z',
      refreshToken: 'refresh-secret',
    }
    const first = vault.seal(tokens)
    const second = vault.seal(tokens)

    expect(first).not.toBe(second)
    expect(first).not.toContain('access-secret')
    expect(vault.open(first)).toEqual(tokens)
    expect(vault.open(second)).toEqual(tokens)
  })

  it('should reject malformed keys and modified ciphertext', () => {
    expect(() => createTokenVault('not-base64')).toThrow(
      'POMO_CALENDAR_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
    )

    const vault = createTokenVault(key)
    const ciphertext = vault.seal({accessToken: 'access', expiresAt: null, refreshToken: null})

    expect(() => vault.open(`${ciphertext}modified`)).toThrow(
      'Calendar token ciphertext is invalid',
    )
  })
})
