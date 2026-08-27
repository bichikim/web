import {describe, expect, it} from 'vitest'

import {
  buildPasswordRecoveryRedirectUrl,
  CHANGE_PASSWORD_PATH,
  PASSWORD_RECOVERY_VERIFY_PATH,
} from '../redirect-url'

describe('buildPasswordRecoveryRedirectUrl', () => {
  it('should append the verification path to the supplied origin', () => {
    expect(buildPasswordRecoveryRedirectUrl('https://coong.example')).toBe(
      'https://coong.example/auth/verify-email',
    )
    expect(PASSWORD_RECOVERY_VERIFY_PATH).toBe('/auth/verify-email')
    expect(CHANGE_PASSWORD_PATH).toBe('/auth/change-password')
  })
})
