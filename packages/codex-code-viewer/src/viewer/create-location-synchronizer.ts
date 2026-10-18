import type {ViewerSession} from '../shared/contracts'
import type {ViewerPort} from './types'

interface LocationSynchronizer {
  readonly port: ViewerPort
  readonly report: (error: unknown) => void
}

/** Synchronizes changed file paths and permits a later retry after a rejected update. */
export const createLocationSynchronizer = ({port, report}: LocationSynchronizer) => {
  let previous: string | undefined
  return (session: ViewerSession): void => {
    const location = {path: session.document.location.path, workspace: session.workspace}
    const identity = JSON.stringify(location)
    if (identity === previous) {
      return
    }
    previous = identity
    port.location?.(location).catch((error) => {
      if (previous === identity) {
        previous = undefined
      }
      report(error)
    })
  }
}
