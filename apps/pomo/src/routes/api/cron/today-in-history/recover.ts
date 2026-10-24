import type {APIEvent} from '@solidjs/start/server'
import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {recoverHistoryGenerations} from 'src/server/history-generation/recover-generations'
import {noStoreEmpty, noStoreJson, noStoreText} from 'src/server/http/response'

const HTTP_UNAUTHORIZED = 401
const HTTP_INTERNAL_SERVER_ERROR = 500

export const GET = async (event: APIEvent): Promise<Response> => {
  if (!isAuthorizedCronRequest(event.request)) {
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  try {
    const result = await recoverHistoryGenerations()

    return result.checked === 0 ? noStoreEmpty() : noStoreJson(result)
  } catch (error) {
    console.error('Failed to recover today-in-history generation', error)
    return noStoreText('Generation recovery failed', {status: HTTP_INTERNAL_SERVER_ERROR})
  }
}
