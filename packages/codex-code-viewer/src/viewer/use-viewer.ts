import {batch, createSignal} from 'solid-js'
import {z} from 'zod'
import {
  type CodeDocument,
  type CodeLocation,
  type CodeToken,
  documentSchema,
  filesSchema,
  navigationSchema,
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
import {useNotice} from './use-notice'
import {useCodeClipboard} from './use-code-clipboard'
import {createSessionRequest} from './create-session-request'
import {createLocationSynchronizer} from './create-location-synchronizer'

const sameDocument = (previous: CodeDocument, next: CodeDocument): boolean =>
  previous.revision === next.revision &&
  previous.location.path === next.location.path &&
  previous.location.line === next.location.line &&
  previous.location.column === next.location.column

export const useViewer = (port: ViewerPort) => {
  const [session, setSession] = createSignal<ViewerSession | null>(null)
  const history = useFileHistory()
  const {notice, notify, dismiss} = useNotice()
  const [choices, setChoices] = createSignal<CodeLocation[]>([])
  const [files, setFiles] = createSignal<string[]>([])
  const [search, setSearch] = createSignal('')

  const request = createSessionRequest({port, session})
  const report = (error: unknown): void => notify(errorMessage(error))
  const copy = useCodeClipboard({onError: report, onNotice: notify})
  const copyPath = (path: string): Promise<void> => copy(path, '경로를 복사했습니다.')
  const codeSelection = useCodeSelection({onError: report, onNotice: notify, port, session})
  const viewState = useSessionViewState({selection: codeSelection.selection, session})
  const navigation = useLatestRequest(report)
  const searching = useLatestRequest(report)
  const synchronizeLocation = createLocationSynchronizer({port, report})
  const receive = (value: ViewerSession, options?: NavigationOptions): void => {
    const previous = session()
    if (previous !== null && previous.session !== value.session) {
      port.call('code.close', {session: previous.session}).catch(report)
    }
    navigation.cancel()
    searching.cancel()
    batch(() => {
      const restore =
        options?.restoreView ??
        (value.document.location.line === 1 && value.document.location.column === 1)
      const selected = viewState.restore(value, restore)
      setSession(value)
      codeSelection.reset(value.document, selected)
    })
    history.reset(value.document.location)
    setChoices([])
    setFiles([])
    synchronizeLocation(value)
  }
  const go = async (location: CodeLocation, options?: NavigationOptions): Promise<void> => {
    const current = session()
    if (current === null) {
      return
    }
    const result = await navigation.run(() =>
      request('code.read', location, z.object({document: documentSchema})),
    )
    if (result === null) {
      return
    }
    const nextDocument = result.document
    batch(() => {
      const selected = viewState.restore(
        {...current, document: nextDocument},
        options?.restoreView === true || options?.preserveSelection === true,
      )
      if (!sameDocument(current.document, nextDocument)) {
        setSession({...current, document: nextDocument})
      }
      if (options?.preserveSelection) {
        codeSelection.preserve(nextDocument)
      } else {
        codeSelection.reset(nextDocument, selected)
      }
    })
    history.record(result.document.location, options?.historyIndex)
    setChoices([])
    synchronizeLocation({...current, document: nextDocument})
  }
  const follow = async (token: CodeToken): Promise<void> => {
    const current = session()
    if (current === null || token.navigation === null) {
      return
    }
    const result = await navigation.run(() =>
      request(
        'code.navigate',
        {
          navigation: token.navigation,
          offset: token.offset,
          path: current.document.location.path,
          revision: current.document.revision,
        },
        navigationSchema,
      ),
    )
    if (result === null) {
      return
    }
    const [location] = result.locations
    if (result.locations.length === 1 && location !== undefined) {
      await go(location)
    } else {
      setChoices(result.locations)
      notify(
        location === undefined
          ? '이동 대상이 없습니다. 작업 폴더 밖의 정의는 표시하지 않습니다.'
          : '이동할 정의를 선택하세요.',
      )
    }
  }
  const move = async (direction: -1 | 1): Promise<void> => {
    const location = history.destination(direction)
    if (location !== undefined) {
      await go(location, {historyIndex: history.index() + direction, restoreView: true})
    }
  }
  const refresh = async (): Promise<void> => {
    const current = session()
    if (current !== null && !navigation.pending()) {
      await go(current.document.location, {historyIndex: history.index(), preserveSelection: true})
    }
  }
  const find = async (query: string): Promise<void> => {
    setSearch(query)
    const result = await searching.run(() => request('code.list', {query}, filesSchema))
    if (result !== null) {
      setFiles(result.paths)
    }
  }
  const opening = useOpenFile(port, receive, report)
  const openLocation = createLocationOpener({go, open: opening.open, session})
  useViewerConnection({port, receive, refresh, report, session})
  return {
    ...opening,
    address: codeSelection.address,
    busy: navigation.pending,
    canBack: history.canBack,
    canForward: history.canForward,
    choices,
    copy,
    copyPath,
    dismissNotice: dismiss,
    files,
    find,
    finding: searching.pending,
    follow,
    go,
    move,
    notice,
    openLocation,
    refresh,
    reportError: report,
    search,
    selection: codeSelection.selection,
    selectLines: codeSelection.selectLines,
    selectText: codeSelection.selectText,
    session,
    share: codeSelection.share,
    sharePath: codeSelection.sharePath,
    viewState,
  }
}
