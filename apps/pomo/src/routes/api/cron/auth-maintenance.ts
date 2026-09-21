import {createAuthorizedCronHandler} from 'src/server/cron/create-authorized-cron-handler'
import {runAuthMaintenance} from 'src/server/auth/maintenance'

export const GET = createAuthorizedCronHandler({
  authorizeFailureLog: 'Failed to authorize auth maintenance',
  run: () => runAuthMaintenance(),
  runFailureLog: 'Failed to clean expired authentication data',
  runFailureMessage: 'Auth maintenance failed',
})
