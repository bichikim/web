import {noStoreJson} from '../http/response'
import {getAdminSession} from './session'

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_SERVICE_UNAVAILABLE = 503

interface AuthorizedAdminRequest {
  readonly authorized: true
  readonly cookies: ReadonlyArray<string>
}

interface RejectedAdminRequest {
  readonly authorized: false
  readonly response: Response
}

export type AdminAuthorization = AuthorizedAdminRequest | RejectedAdminRequest

export const authorizeAdminRequest = async (request: Request): Promise<AdminAuthorization> => {
  try {
    const result = await getAdminSession(request)

    switch (result.access) {
      case 'admin':
        return {authorized: true, cookies: result.cookies}
      case 'anonymous':
        return {
          authorized: false,
          response: noStoreJson(
            {error: 'unauthorized'},
            {cookies: result.cookies, status: HTTP_UNAUTHORIZED},
          ),
        }
      case 'forbidden':
        return {
          authorized: false,
          response: noStoreJson(
            {error: 'forbidden'},
            {cookies: result.cookies, status: HTTP_FORBIDDEN},
          ),
        }
      case 'invalid':
        return {
          authorized: false,
          response: noStoreJson(
            {error: 'authentication_unavailable'},
            {cookies: result.cookies, status: HTTP_SERVICE_UNAVAILABLE},
          ),
        }
      default: {
        const exhaustiveAccess: never = result.access
        return exhaustiveAccess
      }
    }
  } catch (error) {
    console.error('Pomo admin API authentication is unavailable', error)
    return {
      authorized: false,
      response: noStoreJson(
        {error: 'authentication_unavailable'},
        {status: HTTP_SERVICE_UNAVAILABLE},
      ),
    }
  }
}
