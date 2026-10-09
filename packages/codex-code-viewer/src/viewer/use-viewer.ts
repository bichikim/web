import {createConnectionReceiver} from './create-connection-receiver'
import {batch, createMemo, createSignal} from 'solid-js'
import {z} from 'zod'
import {
  type CodeDocument,
  type CodeLocation,
  type CodeSource,
  documentSchema,
  type ViewerConnection,
  type ViewerSession,
} from '../shared/contracts'
import {errorMessage} from './error-message'
import type {NavigationOptions, ViewerPort} from './types'
import {useCodeSelection} from './use-code-selection'
import {useFileHistory} from './use-file-history'
import {useLatestRequest} from './use-latest-request'
import {useViewerConnection} from './use-viewer-connection'
import {useOpenFile} from './use-open-file'
import {createLocationOpener} from './create-location-opener'
import {useSessionViewState} from './use-session-view-state'
import {useViewerFeedback} from './use-viewer-feedback'
import {useCodeClipboard} from './use-code-clipboard'
import {createSessionRequest} from './create-session-request'
import {createLocationSynchronizer} from './create-location-synchronizer'
import {useFileSearch} from './use-file-search'
import {useDefinitionNavigation} from './use-definition-navigation'
import {useCodeEditing} from './use-code-editing'
import {createFileMutationHandler} from './create-file-mutation-handler'
import {useDocumentRefresh} from './use-document-refresh'

const sameDocument = (previous: CodeDocument, next: CodeDocument): boolean =>
  previous.revision === next.revision &&
  previous.location.path === next.location.path &&
  previous.location.line === next.location.line &&
  previous.location.column === next.location.column

const documentSession = (connection: ViewerConnection | null): ViewerSession | null =>
  connection !== null && 'document' in connection ? connection : null

const mergeSavedDocument = (
  current: ViewerConnection | null,
  value: ViewerSession,
): ViewerConnection | null =>
  current !== null &&
  'document' in current &&
  current.workspace === value.workspace &&
  current.document.location.path === value.document.location.path
    ? {...current, document: {...value.document, location: current.document.location}}
    : current

const withDraftLocation = (
  document: CodeDocument,
  location: CodeLocation,
  sources: readonly CodeSource[],
): CodeDocument => {
  const draft = sources.find((entry) => entry.path === document.location.path)
  return draft === undefined
    ? document
    : {
        ...document,
        location: {
          ...location,
          line: Math.min(location.line, draft.source.split(/\r\n|\r|\n/u).length),
          path: document.location.path,
        },
      }
}

interface ReceivedViewOptions {
  readonly editing: ReturnType<typeof useCodeEditing>
  readonly codeSelection: ReturnType<typeof useCodeSelection>
  readonly viewState: ReturnType<typeof useSessionViewState>
  readonly setConnection: (value: ViewerConnection) => void
}
const receiveView = (
  value: ViewerConnection,
  navigation: NavigationOptions | undefined,
  options: ReceivedViewOptions,
): void => {
  batch(() => {
    if ('document' in value) {
      options.editing.accept(value)
    }
    options.setConnection(value)
    if (!('document' in value)) {
      options.codeSelection.clear()
      return
    }
    const restore =
      navigation?.restoreView ??
      (value.document.location.line === 1 && value.document.location.column === 1)
    const selected = options.viewState.restore(value, restore)
    options.codeSelection.reset(value.document, selected)
  })
}

interface NavigatedViewOptions extends ReceivedViewOptions {
  readonly connection: ViewerConnection
  readonly document: CodeDocument
  readonly location: CodeLocation
  readonly navigation?: NavigationOptions
}
const receiveDocument = (options: NavigatedViewOptions): CodeDocument => {
  const document = withDraftLocation(options.document, options.location, options.editing.sources())
  const next = {...options.connection, document}
  batch(() => {
    options.editing.accept(next)
    const selected = options.viewState.restore(
      next,
      options.navigation?.restoreView === true || options.navigation?.preserveSelection === true,
    )
    if (
      !('document' in options.connection) ||
      !sameDocument(options.connection.document, document)
    ) {
      options.setConnection(next)
    }
    if (options.navigation?.preserveSelection) {
      options.codeSelection.preserve(document)
    } else {
      options.codeSelection.reset(document, selected)
    }
  })
  return document
}

interface DocumentReceiverOptions extends ReceivedViewOptions {
  readonly history: ReturnType<typeof useFileHistory>
  readonly onReset: () => void
  readonly onNavigate: () => void
  readonly synchronize: (session: ViewerSession) => void
}
const createDocumentReceiver =
  (options: DocumentReceiverOptions) =>
  (
    current: ViewerConnection,
    document: CodeDocument,
    location: CodeLocation,
    navigation?: NavigationOptions,
  ): void => {
    options.onReset()
    const nextDocument = receiveDocument({
      ...options,
      connection: current,
      document,
      location,
      navigation,
    })
    options.history.record(document.location, navigation?.historyIndex)
    options.onNavigate()
    options.synchronize({...current, document: nextDocument})
  }

interface HistoryMoveProps {
  readonly direction: -1 | 1
  readonly history: ReturnType<typeof useFileHistory>
  readonly go: (location: CodeLocation, options?: NavigationOptions) => Promise<void>
}
const moveHistory = async ({direction, history, go}: HistoryMoveProps): Promise<void> => {
  const location = history.destination(direction)
  if (location !== undefined) {
    await go(location, {historyIndex: history.index() + direction, restoreView: true})
  }
}

export const useViewer = (port: ViewerPort) => {
  const [connection, setConnection] = createSignal<ViewerConnection | null>(null)
  const session = createMemo(() => documentSession(connection()))
  const editing = useCodeEditing({
    onDiscardDeleted: (value) => receive({session: value.session, workspace: value.workspace}),
    onSaved: (value) => {
      setConnection((current) => mergeSavedDocument(current, value))
      refreshing.reset()
    },
    port,
    session,
  })
  const history = useFileHistory()
  const feedback = useViewerFeedback({
    clearDefinition: () => definitions.dismissFeedback(),
    clearEditing: editing.dismissFeedback,
    definition: () => definitions.feedback(),
    editing: editing.feedback,
  })
  const request = createSessionRequest({port, session: connection})
  const report = (error: unknown): void => feedback.notify(errorMessage(error))
  const copy = useCodeClipboard({onError: report, onNotice: feedback.notify})
  const codeSelection = useCodeSelection({
    onError: report,
    onNotice: feedback.notify,
    port,
    session,
    source: () =>
      editing.editable() && (editing.enabled() || editing.dirty()) ? editing.source() : undefined,
    workspace: () => connection()?.workspace,
  })
  const viewState = useSessionViewState({selection: codeSelection.selection, session})
  const navigation = useLatestRequest(report)
  const search = useFileSearch({onError: report, port, session: connection})
  const synchronizeLocation = createLocationSynchronizer({port, report})
  const receive = createConnectionReceiver({
    confirmLeave: editing.confirmLeave,
    connection,
    onReceive: (value, options) => {
      navigation.cancel()
      refreshing.reset()
      search.reset()
      receiveView(value, options, {codeSelection, editing, setConnection, viewState})
      history.reset('document' in value ? value.document.location : undefined)
      definitions.reset()
      if ('document' in value) {
        synchronizeLocation(value)
      }
    },
    pending: () => editing.pendingFiles().length > 0 || editing.saving(),
    port,
    report,
  })
  const showDocument = createDocumentReceiver({
    codeSelection,
    editing,
    history,
    onNavigate: () => definitions.reset(),
    onReset: () => refreshing.reset(),
    setConnection,
    synchronize: synchronizeLocation,
    viewState,
  })
  const read = (location: CodeLocation) =>
    request('code.read', location, z.object({document: documentSchema}))
  const go = async (location: CodeLocation, options?: NavigationOptions): Promise<void> => {
    const current = connection()
    if (current === null) {
      return
    }
    const result = await navigation.run(() => read(location))
    if (result !== null) {
      showDocument(current, result.document, location, options)
    }
  }
  const definitions = useDefinitionNavigation({
    onOpen: go,
    port,
    revision: editing.revision,
    run: navigation.run,
    session,
    sources: editing.sources,
  })
  const refreshing = useDocumentRefresh({
    dirty: editing.dirty,
    navigation,
    onDeleted: editing.markDeleted,
    onDocument: (current, document) =>
      showDocument(current, document, current.document.location, {
        historyIndex: history.index(),
        preserveSelection: true,
      }),
    onPresent: editing.accept,
    read,
    report,
    saving: editing.saving,
    session,
  })
  const opening = useOpenFile(port, receive, report)
  const workspaceRevision = useViewerConnection({
    beforeClose: editing.confirmLeave,
    blocked: () => navigation.pending() || editing.saving(),
    port,
    receive,
    refresh: refreshing.refresh,
    report,
    session: connection,
  })
  return {
    ...opening,
    address: () => codeSelection.address() || connection()?.workspace || '',
    busy: navigation.pending,
    canBack: history.canBack,
    canForward: history.canForward,
    ...definitions,
    copy,
    copyPath: (path: string): Promise<void> => copy(path, '경로를 복사했습니다.'),
    deleted: refreshing.deleted,
    dismissNotice: feedback.dismiss,
    editing,
    fileMutation: createFileMutationHandler({
      go,
      onChange: history.applyMutation,
      onMove: editing.accept,
      receive,
      session: connection,
    }),
    files: search.files,
    find: search.find,
    finding: search.finding,
    go,
    move: (direction: -1 | 1) => moveHistory({direction, go, history}),
    notice: feedback.notice,
    openLocation: createLocationOpener({go, open: opening.open, session}),
    refresh: refreshing.refresh,
    reportError: report,
    search: search.search,
    selection: codeSelection.selection,
    selectLines: codeSelection.selectLines,
    selectText: codeSelection.selectText,
    session,
    share: codeSelection.share,
    shareChanges: editing.shareChanges,
    sharePath: codeSelection.sharePath,
    viewState,
    workspaceRevision,
    workspaceSession: connection,
  }
}
