import type {APIEvent} from '@solidjs/start/server'
import {recoverApiAiJobs} from 'src/server/api-ai/service'
import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {noStoreJson, noStoreText} from 'src/server/http/response'

export const GET = async (event: APIEvent): Promise<Response> => {
  if (!isAuthorizedCronRequest(event.request)) {
    return noStoreText('Unauthorized', {status: 401})
  }
  try {
    await recoverApiAiJobs()
    return noStoreJson({ok: true})
  } catch (error: unknown) {
    console.error('Failed to recover API AI jobs', error)
    return noStoreText('AI recovery failed', {status: 500})
  }
}
