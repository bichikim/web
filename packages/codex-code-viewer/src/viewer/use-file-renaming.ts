import {type Accessor, batch, createEffect, createSignal, on} from 'solid-js'
import {
  entrySchema,
  type EntrySnapshot,
  entrySnapshotSchema,
  type ViewerConnection,
} from '../shared/contracts'
import {callViewerTool} from './call-viewer-tool'
import {errorMessage} from './error-message'
import {hasPendingPath} from './has-pending-path'
import {relativeWorkspacePath} from './relative-workspace-path'
import type {FileMutation, ViewerPort, WorkspaceSelection} from './types'
import {useLatestRequest} from './use-latest-request'

interface UseFileRenamingProps {
  readonly onChanged: (change: FileMutation) => Promise<void>
  readonly onRefresh?: () => void
  readonly pendingPaths: Accessor<readonly string[]>
  readonly port: ViewerPort
  readonly saving: Accessor<boolean>
  readonly session: Accessor<ViewerConnection | null>
  readonly busy: Accessor<boolean>
}
interface RenameContext extends EntrySnapshot {
  readonly session: string
}
export const useFileRenaming = (props: UseFileRenamingProps) => {
  const [renaming, setRenaming] = createSignal<RenameContext | null>(null)
  const [renameName, setRenameName] = createSignal('')
  const [renameFeedback, setRenameFeedback] = createSignal('')
  const request = useLatestRequest((error) => {
    setRenameFeedback(errorMessage(error))
    props.onRefresh?.()
  })
  createEffect(
    on(
      () => props.session()?.session,
      () => {
        request.cancel()
        batch(() => {
          setRenaming(null)
          setRenameFeedback('')
        })
      },
    ),
  )
  const available = (path: string): boolean => {
    if (props.saving() || hasPendingPath(path, props.pendingPaths())) {
      setRenameFeedback('미저장 변경을 먼저 저장하거나 버린 뒤 파일 작업을 해 주세요.')
      return false
    }
    return true
  }
  const askRename = async (selection: WorkspaceSelection): Promise<void> => {
    const session = props.session()
    if (session === null || request.pending() || props.busy()) {
      return
    }
    const path = relativeWorkspacePath(session.workspace, selection.path)
    if (path === null || path === '' || !available(path)) {
      return
    }
    setRenameFeedback('')
    const entry = await request.run(() =>
      callViewerTool({
        input: {path, session: session.session},
        name: 'code.entry',
        port: props.port,
        schema: entrySnapshotSchema,
      }),
    )
    if (entry !== null && props.session()?.session === session.session) {
      batch(() => {
        setRenameName(entry.path.split('/').at(-1) ?? '')
        setRenaming({...entry, session: session.session})
      })
    }
  }
  const confirmRename = async (): Promise<void> => {
    const current = renaming()
    const name = renameName()
    if (
      current === null ||
      request.pending() ||
      props.busy() ||
      name.trim() === '' ||
      !available(current.path)
    ) {
      return
    }
    if (name === current.path.split('/').at(-1)) {
      setRenaming(null)
      return
    }
    setRenameFeedback('')
    const result = await request.run(async () => {
      const entry = await callViewerTool({
        input: {name, path: current.path, revision: current.revision, session: current.session},
        name: 'code.rename',
        port: props.port,
        schema: entrySchema,
      })
      if (props.session()?.session === current.session) {
        await props.onChanged({action: 'rename', entry, source: current.path})
      }
      return entry
    })
    if (result !== null && renaming() === current) {
      batch(() => {
        setRenaming(null)
        setRenameFeedback(`${result.path} · 이름을 변경했습니다.`)
      })
    }
  }
  return {
    askRename,
    cancelRename: () => {
      if (!request.pending()) {
        setRenaming(null)
      }
    },
    changeRename: (value: string) => {
      setRenameName(value)
      setRenameFeedback('')
    },
    confirmRename,
    dismissRenameFeedback: () => setRenameFeedback(''),
    renameFeedback,
    renameName,
    renamePending: request.pending,
    renaming,
  }
}
