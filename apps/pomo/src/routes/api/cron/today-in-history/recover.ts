import type {APIEvent} from '@solidjs/start/server'

import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {recoverHistoryGenerations} from 'src/server/history-generation/recover-generations'

export const GET = async (event: APIEvent): Promise<Response> => {
  if (!isAuthorizedCronRequest(event.request)) {
    return new Response('Unauthorized', {status: 401})
  }

  try {
    const result = await recoverHistoryGenerations()

    return result.checked === 0 ? new Response(null, {status: 204}) : Response.json(result)
  } catch (error) {
    console.error('Failed to recover today-in-history generation', error)
    return new Response('Generation recovery failed', {status: 500})
  }
}
