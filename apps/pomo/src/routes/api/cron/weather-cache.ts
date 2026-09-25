import {createAuthorizedCronHandler} from 'src/server/cron/create-authorized-cron-handler'
import {runWeatherCacheMaintenance} from 'src/server/weather/cache-maintenance'

export const GET = createAuthorizedCronHandler({
  authorizeFailureLog: 'Failed to authorize weather cache maintenance',
  run: () => runWeatherCacheMaintenance(),
  runFailureLog: 'Failed to delete expired weather cache',
  runFailureMessage: 'Weather cache maintenance failed',
})
