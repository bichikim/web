import {type Accessor, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import type {ViewerConnection} from '../shared/contracts'
import type {ViewerPort} from './types'

interface UseWorkspaceUpdatesProps {
  readonly port: ViewerPort
  readonly session: Accessor<ViewerConnection | null>
  readonly blocked: Accessor<boolean>
  readonly refresh: () => Promise<void>
  readonly report: (error: unknown) => void
}

export const useWorkspaceUpdates = (props: UseWorkspaceUpdatesProps): Accessor<number> => {
  const [revision, setRevision] = createSignal(0)
  const [pending, setPending] = createSignal(false)
  const session = createMemo(() => props.session()?.session)
  createEffect(
    on(session, (current) => {
      let disposed = false
      let stop: (() => Promise<void>) | undefined
      setPending(false)
      if (current !== undefined) {
        props.port
          .watch?.(
            current,
            () => {
              if (!disposed) {
                setRevision((value) => value + 1)
                setPending(true)
              }
            },
            props.report,
          )
          .then(async (dispose) => {
            if (disposed) {
              await dispose()
            } else {
              stop = dispose
            }
          })
          .catch(props.report)
      }
      onCleanup(() => {
        disposed = true
        stop?.().catch(props.report)
      })
    }),
  )
  createEffect(
    on([pending, props.blocked], ([requested, blocked]) => {
      if (requested && !blocked) {
        setPending(false)
        props.refresh().catch(props.report)
      }
    }),
  )
  return revision
}
