import {type Accessor, createSignal, onCleanup} from 'solid-js'
import type {ViewerConnection} from '../shared/contracts'
import type {ViewerPort} from './types'
import {useWorkspaceUpdates} from './use-workspace-updates'
import {createPendingTasks} from './create-pending-tasks'

interface UseViewerConnectionProps {
  port: ViewerPort
  receive: Parameters<ViewerPort['start']>[0]
  refresh: () => Promise<void>
  report: (error: unknown) => void
  session: Accessor<ViewerConnection | null>
  blocked?: Accessor<boolean>
  beforeClose?: () => Promise<boolean>
}

export const useViewerConnection = (props: UseViewerConnectionProps): Accessor<number> => {
  const [ready, setReady] = createSignal(false)
  let disposed = false
  let disposePort: (() => void) | null = null
  let released = false
  const closing = createPendingTasks()
  const closeSession = (value: ViewerConnection): void => {
    closing.run(() => props.port.call('code.close', {session: value.session})).catch(props.report)
  }
  const finish = async (): Promise<void> => {
    await closing.settle()
    if (disposePort !== null && !released) {
      released = true
      disposePort()
    }
  }
  const receive: UseViewerConnectionProps['receive'] = (value, navigation): void => {
    if (disposed) {
      closeSession(value)
    } else {
      props.receive(value, navigation)
    }
  }
  const refresh = (): void => {
    if (!disposed) {
      props.refresh()
    }
  }
  const teardown = async (): Promise<void> => {
    if (!disposed) {
      disposed = true
      setReady(false)
      const current = props.session()
      if (current !== null) {
        closeSession(current)
      }
    }
    await closing.settle()
  }
  props.port
    .start(receive, props.report, refresh, async () => {
      if (props.beforeClose !== undefined && !(await props.beforeClose())) {
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
    .catch(props.report)
  const revision = useWorkspaceUpdates({
    blocked: () => disposed || (props.blocked?.() ?? false),
    port: props.port,
    refresh: props.refresh,
    report: props.report,
    session: () => (ready() ? props.session() : null),
  })
  onCleanup(() => {
    teardown().then(finish).catch(props.report)
  })
  return revision
}
