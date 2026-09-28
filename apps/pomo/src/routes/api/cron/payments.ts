import type {APIEvent} from '@solidjs/start/server'

import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {noStoreJson, noStoreText} from 'src/server/http/response'
import {retryPaddleProviderEvents} from 'src/server/payment'

const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_UNAUTHORIZED = 401

export const GET = async (event: APIEvent): Promise<Response> => {
  if (!isAuthorizedCronRequest(event.request)) {
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  try {
    return noStoreJson(await retryPaddleProviderEvents())
  } catch (error: unknown) {
    console.error('Failed to retry Paddle provider events', error)
    return noStoreText('Payment event retry failed', {status: HTTP_INTERNAL_SERVER_ERROR})
  }
}
