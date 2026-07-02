export const CHANGE_PASSWORD_PATH = '/auth/change-password'

export const buildChangePasswordRedirectUrl = (baseUrl: string): string => {
  return `${baseUrl}${CHANGE_PASSWORD_PATH}`
}
