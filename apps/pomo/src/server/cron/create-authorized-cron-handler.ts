import type {APIEvent} from '@solidjs/start/server'
import {isAuthorizedCronRequest} from './environment'
import {noStoreJson, noStoreText} from '../http/response'

const HTTP_UNAUTHORIZED = 401
const HTTP_INTERNAL_SERVER_ERROR = 500

export interface CreateAuthorizedCronHandlerOptions {
  readonly run: () => Promise<unknown>
  readonly authorizeFailureLog: string
  readonly runFailureLog: string
  readonly runFailureMessage: string
}

/** Authorizes cron requests and returns private success or failure responses. */
export const createAuthorizedCronHandler =
  (
    options: CreateAuthorizedCronHandlerOptions,
  ): ((event: Pick<APIEvent, 'request'>) => Promise<Response>) =>
  async (event) => {
    try {
      if (!isAuthorizedCronRequest(event.request)) {
        return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
      }
    } catch (error: unknown) {
      console.error(options.authorizeFailureLog, error)
      return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
    }
    try {
      return noStoreJson(await options.run())
    } catch (error: unknown) {
      console.error(options.runFailureLog, error)
      return noStoreText(options.runFailureMessage, {status: HTTP_INTERNAL_SERVER_ERROR})
    }
  }
