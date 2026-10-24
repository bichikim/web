import {noStoreJson} from '../http/response'
import {resolveUserRequest, type UserRequestIdentity} from './resolve-user-request'
import {isUserRequestResolutionError} from './user-request-resolution-error'

const HTTP_SERVICE_UNAVAILABLE = 503

export interface ResolveUserRequestOrUnavailableOptions {
  readonly logMessage: string
  readonly unavailableError: string
}

export type ResolvedUserRequest =
  | {readonly kind: 'ok'; readonly identity: UserRequestIdentity}
  | {readonly kind: 'unavailable'; readonly response: Response}

/** Resolves a user or returns a private unavailable response for identity storage failures. */
export const resolveUserRequestOrUnavailable = async (
  request: Request,
  options: ResolveUserRequestOrUnavailableOptions,
): Promise<ResolvedUserRequest> => {
  try {
    return {identity: await resolveUserRequest(request), kind: 'ok'}
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }
    console.error(options.logMessage, error.cause)
    return {
      kind: 'unavailable',
      response: noStoreJson(
        {error: options.unavailableError},
        {cookies: error.cookies, status: HTTP_SERVICE_UNAVAILABLE},
      ),
    }
  }
}
