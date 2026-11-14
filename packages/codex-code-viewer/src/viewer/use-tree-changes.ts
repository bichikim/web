import {type Accessor, createEffect, createMemo, createSignal, on} from 'solid-js'
import type {CodeLocation, CodeSource, ViewerConnection} from '../shared/contracts'
import type {ChangedFile} from '../shared/change-contracts'
import type {ViewerPort} from './types'
import {useWorkspaceChanges} from './use-workspace-changes'

interface UseTreeChangesProps {
  readonly port: ViewerPort
  readonly session: Accessor<ViewerConnection | null>
  readonly revision: Accessor<number>
  readonly sources: Accessor<readonly CodeSource[]>
  readonly files: Accessor<readonly ChangedFile[] | undefined>
  readonly available: Accessor<boolean | undefined>
  readonly base: Accessor<string | undefined>
  readonly onOpen: (location: CodeLocation) => void
  readonly onDeleted?: (path: string) => void
  readonly onError: (error: unknown) => void
}

/** Owns changed-only filtering and deleted-file previews separately from the cached disk tree. */
export const useTreeChanges = (props: UseTreeChangesProps) => {
  const git = useWorkspaceChanges(props)
  const [changedOnly, setChangedOnly] = createSignal(false)
  const files = createMemo(() => props.files() ?? git.files())
  const available = () => props.available() ?? git.available()
  const workspace = createMemo(() => props.session()?.workspace)
  createEffect(on(workspace, () => setChangedOnly(false)))
  const open = (location: CodeLocation): void => {
    if (files().some((file) => file.path === location.path && file.kind === 'deleted')) {
      props.onDeleted?.(location.path)
    } else {
      props.onOpen(location)
    }
  }
  return {
    ...git,
    available,
    base: () => props.base() ?? git.base(),
    changedOnly: () => available() && changedOnly(),
    deletedPaths: () =>
      files()
        .filter((file) => file.kind === 'deleted')
        .map((file) => `${props.session()?.workspace.replace(/\/$/u, '')}/${file.path}`),
    files,
    open,
    toggle: (): void => {
      setChangedOnly((value) => !value)
    },
  }
}
