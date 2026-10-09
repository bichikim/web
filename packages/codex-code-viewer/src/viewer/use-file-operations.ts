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

interface UseFileOperationsProps {
  readonly onChanged: (change: FileMutation) => Promise<void>
  readonly pendingPaths: Accessor<readonly string[]>
  readonly port: ViewerPort
  readonly saving: Accessor<boolean>
  readonly session: Accessor<ViewerConnection | null>
  readonly onRefresh?: () => void
}
interface ClipboardEntry extends EntrySnapshot {
  readonly action: 'copy' | 'cut'
  readonly session: string
}
interface DeleteEntry extends EntrySnapshot {
  readonly session: string
}
export const useFileOperations = (props: UseFileOperationsProps) => {
  const [clipboard, setClipboard] = createSignal<ClipboardEntry | null>(null)
  const [deleting, setDeleting] = createSignal<DeleteEntry | null>(null)
  const [feedback, setFeedback] = createSignal('')
  const [pasting, setPasting] = createSignal(false)
  const request = useLatestRequest((error) => {
    setFeedback(errorMessage(error))
    props.onRefresh?.()
  })
  createEffect(
    on(
      () => props.session()?.session,
      () => {
        request.cancel()
        batch(() => {
          setClipboard(null)
          setDeleting(null)
          setFeedback('')
          setPasting(false)
        })
      },
    ),
  )
  const available = (path: string): boolean => {
    if (props.saving() || hasPendingPath(path, props.pendingPaths())) {
      setFeedback('미저장 변경을 먼저 저장하거나 버린 뒤 파일 작업을 해 주세요.')
      return false
    }
    return true
  }
  const inspect = async (selection: WorkspaceSelection): Promise<DeleteEntry | null> => {
    const session = props.session()
    if (session === null || request.pending()) {
      return null
    }
    const path = relativeWorkspacePath(session.workspace, selection.path)
    if (path === null || path === '' || !available(path)) {
      return null
    }
    setFeedback('')
    const entry = await request.run(() =>
      callViewerTool({
        input: {path, session: session.session},
        name: 'code.entry',
        port: props.port,
        schema: entrySnapshotSchema,
      }),
    )
    return entry === null ? null : {...entry, session: session.session}
  }
  const capture = async (
    selection: WorkspaceSelection,
    action: ClipboardEntry['action'],
  ): Promise<void> => {
    const entry = await inspect(selection)
    if (entry !== null) {
      setClipboard({...entry, action})
      setFeedback(
        `${entry.path} · ${action === 'copy' ? '복사' : '잘라내기'}했습니다. 대상 폴더에 붙여넣으세요.`,
      )
    }
  }
  const mutate = async (
    current: DeleteEntry,
    action: 'copy' | 'cut' | 'delete',
    parent?: string,
  ) => {
    const input = {path: current.path, revision: current.revision, session: current.session}
    const entry = await callViewerTool({
      input: action === 'delete' ? input : {...input, action, parent},
      name: action === 'delete' ? 'code.remove' : 'code.transfer',
      port: props.port,
      schema: entrySchema,
    })
    if (props.session()?.session === current.session) {
      await props.onChanged({action, entry, source: current.path})
    }
    return entry
  }
  const paste = async (selection: WorkspaceSelection): Promise<void> => {
    const current = clipboard()
    const session = props.session()
    if (current === null || session === null || request.pending()) {
      return
    }
    const target = relativeWorkspacePath(session.workspace, selection.path)
    if (target === null || !available(current.path)) {
      return
    }
    const parent =
      selection.kind === 'directory' ? target : target.split('/').slice(0, -1).join('/')
    setFeedback('')
    setPasting(true)
    const result = await request.run(() => mutate(current, current.action, parent))
    if (props.session()?.session !== current.session) {
      return
    }
    setPasting(false)
    if (result !== null) {
      if (current.action === 'cut') {
        setClipboard(null)
      }
      setFeedback(`${result.path} · 붙여넣었습니다.`)
    }
  }
  const askDelete = async (selection: WorkspaceSelection): Promise<void> => {
    const entry = await inspect(selection)
    if (entry !== null) {
      setDeleting(entry)
    }
  }
  const confirmDelete = async (): Promise<void> => {
    const current = deleting()
    if (current === null || request.pending() || !available(current.path)) {
      return
    }
    const result = await request.run(() => mutate(current, 'delete'))
    if (result !== null) {
      setDeleting(null)
      const copied = clipboard()
      if (
        copied !== null &&
        (copied.path === current.path || copied.path.startsWith(`${current.path}/`))
      ) {
        setClipboard(null)
      }
      setFeedback(`${result.path} · 삭제했습니다.`)
    }
  }
  return {
    askDelete,
    cancelDelete: () => {
      if (!request.pending()) {
        setDeleting(null)
      }
    },
    canPaste: () => clipboard() !== null && !request.pending(),
    confirmDelete,
    copy: (selection: WorkspaceSelection) => capture(selection, 'copy'),
    cut: (selection: WorkspaceSelection) => capture(selection, 'cut'),
    cutPath: () => (clipboard()?.action === 'cut' ? clipboard()?.path : undefined),
    deleting,
    dismissFeedback: () => setFeedback(''),
    feedback,
    paste,
    pasting,
    pending: request.pending,
  }
}
