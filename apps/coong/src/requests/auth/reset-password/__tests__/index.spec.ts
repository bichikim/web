import {describe, expect, it} from 'vitest'
import {buildPasswordRecoveryRedirectUrl, PASSWORD_RECOVERY_VERIFY_PATH} from '../redirect-url'

describe('buildPasswordRecoveryRedirectUrl', () => {
  it('should redirect recovery emails to the verify-email route', () => {
    expect(PASSWORD_RECOVERY_VERIFY_PATH).toBe('/auth/verify-email')
    expect(buildPasswordRecoveryRedirectUrl('https://coong.example')).toBe(
      'https://coong.example/auth/verify-email',
    )
  })
})
