import type {Accessor} from 'solid-js'
import type {ViewerConnection} from '../shared/contracts'
import type {NavigationOptions, ViewerPort} from './types'

interface ConnectionReceiverOptions {
  readonly connection: Accessor<ViewerConnection | null>
  readonly confirmLeave: () => Promise<boolean>
  readonly pending: Accessor<boolean>
  readonly onReceive: (value: ViewerConnection, options?: NavigationOptions) => void
  readonly port: ViewerPort
  readonly report: (error: unknown) => void
}
/** Accepts the latest incoming connection after resolving unsaved changes and releasing older sessions. */
export const createConnectionReceiver = (options: ConnectionReceiverOptions) => {
  let generation = 0
  return async (value: ViewerConnection, navigation?: NavigationOptions): Promise<void> => {
    generation += 1
    const request = generation
    const previous = options.connection()
    if (previous !== null && previous.session !== value.session) {
      const accepted = options.pending() ? await options.confirmLeave() : true
      if (!accepted || request !== generation) {
        options.port.call('code.close', {session: value.session}).catch(options.report)
        return
      }
      options.port.call('code.close', {session: previous.session}).catch(options.report)
    }
    options.onReceive(value, navigation)
  }
}
