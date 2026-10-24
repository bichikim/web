import {createAuthorizedCronHandler} from 'src/server/cron/create-authorized-cron-handler'
import {runTrackDeletionMaintenance} from 'src/server/music/track-deletion-maintenance'

export const GET = createAuthorizedCronHandler({
  authorizeFailureLog: 'Failed to authorize music track deletion maintenance',
  run: () => runTrackDeletionMaintenance(),
  runFailureLog: 'Failed to finalize music track deletions',
  runFailureMessage: 'Music track deletion maintenance failed',
})
