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

const sameDocument = (previous: CodeDocument, next: CodeDocument): boolean =>
  previous.revision === next.revision &&
  previous.location.path === next.location.path &&
  previous.location.line === next.location.line &&
  previous.location.column === next.location.column

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

export const useViewer = (port: ViewerPort) => {
  const [connection, setConnection] = createSignal<ViewerConnection | null>(null)
  const session = createMemo(() => {
    const current = connection()
    return current !== null && 'document' in current ? current : null
  })
  const editing = useCodeEditing({
    onSaved: (value) => setConnection((current) => mergeSavedDocument(current, value)),
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
  const {notify, dismiss} = feedback
  const request = createSessionRequest({port, session: connection})
  const report = (error: unknown): void => notify(errorMessage(error))
  const copy = useCodeClipboard({onError: report, onNotice: notify})
  const copyPath = (path: string): Promise<void> => copy(path, '경로를 복사했습니다.')
  const codeSelection = useCodeSelection({
    onError: report,
    onNotice: notify,
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
  const go = async (location: CodeLocation, options?: NavigationOptions): Promise<void> => {
    const current = connection()
    if (current === null) {
      return
    }
    const result = await navigation.run(() =>
      request('code.read', location, z.object({document: documentSchema})),
    )
    if (result === null) {
      return
    }
    const nextDocument = withDraftLocation(result.document, location, editing.sources())
    batch(() => {
      editing.accept({...current, document: nextDocument})
      const selected = viewState.restore(
        {...current, document: nextDocument},
        options?.restoreView === true || options?.preserveSelection === true,
      )
      if (!('document' in current) || !sameDocument(current.document, nextDocument)) {
        setConnection({...current, document: nextDocument})
      }
      if (options?.preserveSelection) {
        codeSelection.preserve(nextDocument)
      } else {
        codeSelection.reset(nextDocument, selected)
      }
    })
    history.record(result.document.location, options?.historyIndex)
    definitions.reset()
    synchronizeLocation({...current, document: nextDocument})
  }
  const definitions = useDefinitionNavigation({
    onOpen: go,
    port,
    revision: editing.revision,
    run: navigation.run,
    session,
    sources: editing.sources,
  })
  const move = async (direction: -1 | 1): Promise<void> => {
    const location = history.destination(direction)
    if (location !== undefined) {
      await go(location, {historyIndex: history.index() + direction, restoreView: true})
    }
  }
  const refresh = async (): Promise<void> => {
    const current = session()
    if (current !== null && !navigation.pending() && !editing.dirty() && !editing.saving()) {
      await go(current.document.location, {historyIndex: history.index(), preserveSelection: true})
    }
  }
  const opening = useOpenFile(port, receive, report)
  const openLocation = createLocationOpener({go, open: opening.open, session})
  useViewerConnection({
    beforeClose: editing.confirmLeave,
    port,
    receive,
    refresh,
    report,
    session: connection,
  })
  return {
    ...opening,
    address: () => codeSelection.address() || connection()?.workspace || '',
    busy: navigation.pending,
    canBack: history.canBack,
    canForward: history.canForward,
    choices: definitions.choices,
    copy,
    copyPath,
    dismissNotice: dismiss,
    editing,
    files: search.files,
    find: search.find,
    finding: search.finding,
    follow: definitions.follow,
    go,
    move,
    notice: feedback.notice,
    openLocation,
    refresh,
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
    workspaceSession: connection,
  }
}
