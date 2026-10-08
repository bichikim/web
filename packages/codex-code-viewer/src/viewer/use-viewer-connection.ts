import {type Accessor, onCleanup} from 'solid-js'
import type {ViewerConnection} from '../shared/contracts'
import type {ViewerPort} from './types'
import {createPendingTasks} from './create-pending-tasks'

interface ConnectionOptions {
  port: ViewerPort
  receive: (session: ViewerConnection) => void
  refresh: () => void
  report: (error: unknown) => void
  session: Accessor<ViewerConnection | null>
}

export const useViewerConnection = (connection: ConnectionOptions): void => {
  let disposed = false
  let disposePort: (() => void) | null = null
  let released = false
  const closing = createPendingTasks()
  const closeSession = (value: ViewerConnection): void => {
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
  const receive = (value: ViewerConnection): void => {
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
  const teardown = async (): Promise<void> => {
    if (!disposed) {
      disposed = true
      const current = connection.session()
      if (current !== null) {
        closeSession(current)
      }
    }
    await closing.settle()
  }
  connection.port
    .start(receive, connection.report, refresh, teardown)
    .then((dispose) => {
      disposePort = dispose
      if (disposed) {
        return finish()
      }
    })
    .catch(connection.report)
  onCleanup(() => {
    teardown().then(finish).catch(connection.report)
  })
}
