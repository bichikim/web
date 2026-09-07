import type {APIEvent} from '@solidjs/start/server'

import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {noStoreJson, noStoreText} from 'src/server/http/response'
import {runWeatherCacheMaintenance} from 'src/server/weather/cache-maintenance'

const HTTP_UNAUTHORIZED = 401
const HTTP_INTERNAL_SERVER_ERROR = 500

export const GET = async (event: APIEvent): Promise<Response> => {
  try {
    if (!isAuthorizedCronRequest(event.request)) {
      return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
    }
  } catch (error) {
    console.error('Failed to authorize weather cache maintenance', error)
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  try {
    return noStoreJson(await runWeatherCacheMaintenance())
  } catch (error) {
    console.error('Failed to delete expired weather cache', error)
    return noStoreText('Weather cache maintenance failed', {
      status: HTTP_INTERNAL_SERVER_ERROR,
    })
  }
}
