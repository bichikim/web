import type {APIEvent} from '@solidjs/start/server'

import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {startHistoryGeneration} from 'src/server/history-generation/start-generation'
import {noStoreJson, noStoreText} from 'src/server/http/response'

const OK_STATUS = 200
const ACCEPTED_STATUS = 202
const HTTP_UNAUTHORIZED = 401
const HTTP_INTERNAL_SERVER_ERROR = 500

export const GET = async (event: APIEvent): Promise<Response> => {
  if (!isAuthorizedCronRequest(event.request)) {
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  try {
    const result = await startHistoryGeneration()

    return noStoreJson(result, {
      status: result.status === 'submitted' ? ACCEPTED_STATUS : OK_STATUS,
    })
  } catch (error) {
    console.error('Failed to start today-in-history generation', error)
    return noStoreText('Generation submission failed', {status: HTTP_INTERNAL_SERVER_ERROR})
  }
}
