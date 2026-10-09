import {type Accessor, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import type {ViewerConnection} from '../shared/contracts'
import type {ViewerPort} from './types'

interface WorkspaceUpdatesOptions {
  readonly port: ViewerPort
  readonly session: Accessor<ViewerConnection | null>
  readonly blocked: Accessor<boolean>
  readonly refresh: () => Promise<void>
  readonly report: (error: unknown) => void
}

export const useWorkspaceUpdates = (options: WorkspaceUpdatesOptions): Accessor<number> => {
  const [revision, setRevision] = createSignal(0)
  const [pending, setPending] = createSignal(false)
  const session = createMemo(() => options.session()?.session)
  createEffect(
    on(session, (current) => {
      let disposed = false
      let stop: (() => Promise<void>) | undefined
      setPending(false)
      if (current !== undefined) {
        options.port
          .watch?.(current, () => {
            if (!disposed) {
              setRevision((value) => value + 1)
              setPending(true)
            }
          })
          .then(async (dispose) => {
            if (disposed) {
              await dispose()
            } else {
              stop = dispose
            }
          })
          .catch(options.report)
      }
      onCleanup(() => {
        disposed = true
        stop?.().catch(options.report)
      })
    }),
  )
  createEffect(
    on([pending, options.blocked], ([requested, blocked]) => {
      if (requested && !blocked) {
        setPending(false)
        options.refresh().catch(options.report)
      }
    }),
  )
  return revision
}
