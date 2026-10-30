import {type Accessor, createEffect, createMemo, createSignal, on} from 'solid-js'
import type {CodeSource, ViewerConnection} from '../shared/contracts'
import {type ChangedFile, type WorkspaceChanges} from '../shared/change-contracts'
import {useLatestRequest} from './use-latest-request'
import type {ViewerPort} from './types'

interface UseWorkspaceChangesProps {
  readonly port: ViewerPort
  readonly session: Accessor<ViewerConnection | null>
  readonly revision: Accessor<number>
  readonly sources: Accessor<readonly CodeSource[]>
  readonly onError: (error: unknown) => void
}
const EMPTY: WorkspaceChanges = {available: false, base: null, files: []}

export const useWorkspaceChanges = (props: UseWorkspaceChangesProps) => {
  const [snapshot, setSnapshot] = createSignal(EMPTY)
  const listing = useLatestRequest(props.onError)
  const session = createMemo(() => props.session()?.session)
  const workspace = createMemo(() => props.session()?.workspace)
  createEffect(
    on(workspace, () => {
      setSnapshot(EMPTY)
    }),
  )
  createEffect(
    on([session, props.revision], async ([current]) => {
      listing.cancel()
      if (current === undefined || props.port.readChanges === undefined) {
        setSnapshot(EMPTY)
        return
      }
      const read = props.port.readChanges
      const result = await listing.run(() => read(current))
      if (result !== null) {
        setSnapshot(result)
      }
    }),
  )
  const files = createMemo<readonly ChangedFile[]>(() => {
    if (!snapshot().available) {
      return []
    }
    const result = new Map(snapshot().files.map((file) => [file.path, file]))
    for (const source of props.sources()) {
      if (!result.has(source.path)) {
        result.set(source.path, {kind: 'modified', openable: true, path: source.path})
      }
    }
    return [...result.values()]
  })
  return {
    available: () => snapshot().available,
    base: () => snapshot().base,
    files,
  }
}
