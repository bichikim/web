import type {APIEvent} from '@solidjs/start/server'

import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {noStoreJson, noStoreText} from 'src/server/http/response'
import {runTrackDeletionMaintenance} from 'src/server/music/track-deletion-maintenance'

const HTTP_UNAUTHORIZED = 401
const HTTP_INTERNAL_SERVER_ERROR = 500

export const GET = async (event: APIEvent): Promise<Response> => {
  try {
    if (!isAuthorizedCronRequest(event.request)) {
      return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
    }
  } catch (error) {
    console.error('Failed to authorize music track deletion maintenance', error)
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  try {
    return noStoreJson(await runTrackDeletionMaintenance())
  } catch (error) {
    console.error('Failed to finalize music track deletions', error)
    return noStoreText('Music track deletion maintenance failed', {
      status: HTTP_INTERNAL_SERVER_ERROR,
    })
  }
}
