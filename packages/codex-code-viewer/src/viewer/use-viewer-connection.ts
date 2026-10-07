import {type Accessor, onCleanup} from 'solid-js'
import type {ViewerSession} from '../shared/contracts'
import type {ViewerPort} from './types'
import {createPendingTasks} from './create-pending-tasks'

interface ViewerConnection {
  port: ViewerPort
  receive: (session: ViewerSession) => void
  refresh: () => void
  report: (error: unknown) => void
  session: Accessor<ViewerSession | null>
}

export const useViewerConnection = (connection: ViewerConnection): void => {
  let disposed = false
  let disposePort: (() => void) | null = null
  let released = false
  const closing = createPendingTasks()
  const closeSession = (value: ViewerSession): void => {
    closing
      .run(() => connection.port.call('code.close', {session: value.session}))
      .catch(connection.report)
  }
  const finish = async (): Promise<void> => {
    await closing.settle()
    if (disposePort !== null && !released) {
      released = true
      disposePort()
    }
  }
  const receive = (value: ViewerSession): void => {
    if (disposed) {
      closeSession(value)
    } else {
      connection.receive(value)
    }
  }
  const refresh = (): void => {
    if (!disposed) {
      connection.refresh()
    }
  }
  connection.port
    .start(receive, connection.report, refresh)
    .then((dispose) => {
      disposePort = dispose
      if (disposed) {
        return finish()
      }
    })
    .catch(connection.report)
  onCleanup(() => {
    disposed = true
    const current = connection.session()
    if (current !== null) {
      closeSession(current)
    }
    finish().catch(connection.report)
  })
}
