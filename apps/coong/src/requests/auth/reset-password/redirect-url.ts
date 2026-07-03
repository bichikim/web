export const PASSWORD_RECOVERY_VERIFY_PATH = '/auth/verify-email'

export const CHANGE_PASSWORD_PATH = '/auth/change-password'

export const buildPasswordRecoveryRedirectUrl = (baseUrl: string): string => {
  return `${baseUrl}${PASSWORD_RECOVERY_VERIFY_PATH}`
}
