import {hasDeferredSource} from '../shared/has-deferred-source'
import {loadDocumentSource} from './load-document-source'
import {type Accessor, getOwner, onCleanup} from 'solid-js'
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
  let disposed = false
  if (getOwner() !== null) {
    onCleanup(() => {
      disposed = true
      generation += 1
    })
  }
  return async (value: ViewerConnection, navigation?: NavigationOptions): Promise<void> => {
    if (disposed) {
      options.port.call('code.close', {session: value.session}).catch(options.report)
      return
    }
    generation += 1
    const request = generation
    const previous = options.connection()
    if (previous !== null && previous.session !== value.session) {
      const accepted = options.pending() ? await options.confirmLeave() : true
      if (!accepted || request !== generation) {
        options.port.call('code.close', {session: value.session}).catch(options.report)
        return
      }
    }
    try {
      const source =
        'document' in value && hasDeferredSource(value.document)
          ? await loadDocumentSource({
              current: () => !disposed && request === generation,
              document: value.document,
              port: options.port,
              session: value.session,
            })
          : undefined
      if (request !== generation) {
        if (options.connection()?.session !== value.session) {
          options.port.call('code.close', {session: value.session}).catch(options.report)
        }
        return
      }
      if (previous !== null && previous.session !== value.session) {
        options.port.call('code.close', {session: previous.session}).catch(options.report)
      }
      options.onReceive(
        source !== undefined && 'document' in value
          ? {...value, document: {...value.document, source}}
          : value,
        navigation,
      )
    } catch (error) {
      if (request === generation) {
        options.report(error)
      }
      if (options.connection()?.session !== value.session) {
        options.port.call('code.close', {session: value.session}).catch(options.report)
      }
    }
  }
}
