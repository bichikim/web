import type {Accessor} from 'solid-js'
import type {CodeLocation, ViewerSession} from '../shared/contracts'
import type {NavigationOptions} from './types'

interface LocationOpenerOptions {
  readonly go: (location: CodeLocation, options?: NavigationOptions) => Promise<void>
  readonly open: (path: string, options?: NavigationOptions) => Promise<boolean>
  readonly session: Accessor<ViewerSession | null>
}
/** Opens a workspace or absolute address, applying explicit coordinates after opening. */
export const createLocationOpener =
  (options: LocationOpenerOptions) =>
  async (location: CodeLocation, navigation?: NavigationOptions): Promise<void> => {
    if (!location.path.startsWith('/')) {
      await options.go(location, navigation)
      return
    }
    const opened = await options.open(location.path, navigation)
    const current = options.session()
    const positioned =
      navigation?.restoreView === false || location.line !== 1 || location.column !== 1
    if (opened && current !== null && positioned) {
      await options.go({...location, path: current.document.location.path}, {restoreView: false})
    }
  }
