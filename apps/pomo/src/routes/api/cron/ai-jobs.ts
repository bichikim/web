import type {APIEvent} from '@solidjs/start/server'

import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {recoverAiJobs} from 'src/server/ai/service'
import {noStoreJson, noStoreText} from 'src/server/http/response'

const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_UNAUTHORIZED = 401

export const GET = async (event: APIEvent): Promise<Response> => {
  if (!isAuthorizedCronRequest(event.request)) {
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  try {
    return noStoreJson(await recoverAiJobs())
  } catch (error: unknown) {
    console.error('Failed to recover AI jobs', error)
    return noStoreText('AI job recovery failed', {status: HTTP_INTERNAL_SERVER_ERROR})
  }
}
