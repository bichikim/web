import {createAuthorizedCronHandler} from 'src/server/cron/create-authorized-cron-handler'
import {runAlbumCoverMaintenance} from 'src/server/music/album-cover-maintenance'

export const GET = createAuthorizedCronHandler({
  authorizeFailureLog: 'Failed to authorize album cover maintenance',
  run: () => runAlbumCoverMaintenance(),
  runFailureLog: 'Failed to clean up album covers',
  runFailureMessage: 'Album cover maintenance failed',
})
