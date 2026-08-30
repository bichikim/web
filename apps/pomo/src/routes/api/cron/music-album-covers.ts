import type {APIEvent} from '@solidjs/start/server'

import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {noStoreJson, noStoreText} from 'src/server/http/response'
import {runAlbumCoverMaintenance} from 'src/server/music/album-cover-maintenance'

const HTTP_UNAUTHORIZED = 401
const HTTP_INTERNAL_SERVER_ERROR = 500

export const GET = async (event: APIEvent): Promise<Response> => {
  try {
    if (!isAuthorizedCronRequest(event.request)) {
      return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
    }
  } catch (error) {
    console.error('Failed to authorize album cover maintenance', error)
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  try {
    return noStoreJson(await runAlbumCoverMaintenance())
  } catch (error) {
    console.error('Failed to clean up album covers', error)
    return noStoreText('Album cover maintenance failed', {
      status: HTTP_INTERNAL_SERVER_ERROR,
    })
  }
}
