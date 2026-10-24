import {type Accessor, createSignal, onCleanup} from 'solid-js'
import type {ViewerConnection} from '../shared/contracts'
import type {ViewerPort} from './types'
import {useWorkspaceUpdates} from './use-workspace-updates'
import {createPendingTasks} from './create-pending-tasks'

interface ConnectionOptions {
  port: ViewerPort
  receive: Parameters<ViewerPort['start']>[0]
  refresh: () => Promise<void>
  report: (error: unknown) => void
  session: Accessor<ViewerConnection | null>
  blocked?: Accessor<boolean>
  beforeClose?: () => Promise<boolean>
}

export const useViewerConnection = (connection: ConnectionOptions): Accessor<number> => {
  const [ready, setReady] = createSignal(false)
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
  const receive: ConnectionOptions['receive'] = (value, navigation): void => {
    if (disposed) {
      closeSession(value)
    } else {
      connection.receive(value, navigation)
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
      setReady(false)
      const current = connection.session()
      if (current !== null) {
        closeSession(current)
      }
    }
    await closing.settle()
  }
  connection.port
    .start(receive, connection.report, refresh, async () => {
      if (connection.beforeClose !== undefined && !(await connection.beforeClose())) {
        throw new Error('미저장 변경으로 종료를 취소했습니다.')
      }
      await teardown()
    })
    .then((dispose) => {
      disposePort = dispose
      if (disposed) {
        return finish()
      }
      setReady(true)
    })
    .catch(connection.report)
  const revision = useWorkspaceUpdates({
    blocked: () => disposed || (connection.blocked?.() ?? false),
    port: connection.port,
    refresh: connection.refresh,
    report: connection.report,
    session: () => (ready() ? connection.session() : null),
  })
  onCleanup(() => {
    teardown().then(finish).catch(connection.report)
  })
  return revision
}
