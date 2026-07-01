import {describe, expect, it} from 'vitest'
import {buildChangePasswordRedirectUrl, CHANGE_PASSWORD_PATH} from '../redirect-url'

describe('buildChangePasswordRedirectUrl', () => {
  it('should redirect recovery emails to the change-password route', () => {
    expect(CHANGE_PASSWORD_PATH).toBe('/auth/change-password')
    expect(buildChangePasswordRedirectUrl('https://coong.example')).toBe(
      'https://coong.example/auth/change-password',
    )
  })
})
