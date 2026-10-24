const USER_REQUEST_RESOLUTION_ERROR_CODE = 'user_request_resolution_failed'

export class UserRequestResolutionError extends Error {
  readonly code = USER_REQUEST_RESOLUTION_ERROR_CODE
  readonly cookies: ReadonlyArray<string>

  constructor(cookies: ReadonlyArray<string>, cause: unknown) {
    super('Failed to resolve a Pomo user request', {cause})
    this.name = 'UserRequestResolutionError'
    this.cookies = cookies
  }
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const isCookieList = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) && value.every((cookie) => typeof cookie === 'string')

export const isUserRequestResolutionError = (error: unknown): error is UserRequestResolutionError =>
  isRecord(error) &&
  error.code === USER_REQUEST_RESOLUTION_ERROR_CODE &&
  isCookieList(error.cookies)
