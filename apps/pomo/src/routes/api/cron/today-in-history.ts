import type {APIEvent} from '@solidjs/start/server'

import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {startHistoryGeneration} from 'src/server/history-generation/start-generation'

const OK_STATUS = 200
const ACCEPTED_STATUS = 202

export const GET = async (event: APIEvent): Promise<Response> => {
  if (!isAuthorizedCronRequest(event.request)) {
    return new Response('Unauthorized', {status: 401})
  }

  try {
    const result = await startHistoryGeneration()

    return Response.json(result, {
      status: result.status === 'submitted' ? ACCEPTED_STATUS : OK_STATUS,
    })
  } catch (error) {
    console.error('Failed to start today-in-history generation', error)
    return new Response('Generation submission failed', {status: 500})
  }
}
