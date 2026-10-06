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
import {useLatestRequest} from './use-latest-request'
import {useViewerConnection} from './use-viewer-connection'
import {useOpenFile} from './use-open-file'
import {useNotice} from './use-notice'
import {useCodeClipboard} from './use-code-clipboard'

const sameDocument = (previous: CodeDocument, next: CodeDocument): boolean =>
  previous.revision === next.revision &&
  previous.location.path === next.location.path &&
  previous.location.line === next.location.line &&
  previous.location.column === next.location.column

export const useViewer = (port: ViewerPort) => {
  const [session, setSession] = createSignal<ViewerSession | null>(null)
  const [history, setHistory] = createSignal<CodeLocation[]>([])
  const [cursor, setCursor] = createSignal(0)
  const {notice, notify, dismiss} = useNotice()
  const [choices, setChoices] = createSignal<CodeLocation[]>([])
  const [files, setFiles] = createSignal<string[]>([])
  const [search, setSearch] = createSignal('')

  const request = async <Value>(
    name: string,
    input: Record<string, unknown>,
    schema: z.ZodType<Value>,
  ): Promise<Value> => {
    const current = session()
    if (current === null) {
      throw new Error('Codex에서 파일을 먼저 열어 주세요.')
    }
    const result = await port.call(name, {...input, session: current.session})
    if (result.isError) {
      throw new Error(errorMessage(result.structuredContent))
    }
    return schema.parse(result.structuredContent)
  }
  const report = (error: unknown): void => notify(errorMessage(error))
  const copy = useCodeClipboard({onError: report, onNotice: notify})
  const codeSelection = useCodeSelection({onError: report, onNotice: notify, port, session})
  const navigation = useLatestRequest(report)
  const searching = useLatestRequest(report)
  const receive = (value: ViewerSession): void => {
    const previous = session()
    if (previous !== null && previous.session !== value.session) {
      port.call('code.close', {session: previous.session}).catch(report)
    }
    navigation.cancel()
    searching.cancel()
    setSession(value)
    codeSelection.reset(value.document)
    setHistory([value.document.location])
    setCursor(0)
    setChoices([])
    setFiles([])
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
      if (!sameDocument(current.document, nextDocument)) {
        setSession({...current, document: nextDocument})
      }
      if (options?.preserveSelection) {
        codeSelection.preserve(nextDocument)
      } else {
        codeSelection.reset(nextDocument)
      }
    })
    if (options?.historyIndex === undefined) {
      const next = [...history().slice(0, cursor() + 1), result.document.location]
      setHistory(next)
      setCursor(next.length - 1)
    } else {
      setCursor(options.historyIndex)
    }
    setChoices([])
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
    const location = history()[cursor() + direction]
    if (location !== undefined) {
      await go(location, {historyIndex: cursor() + direction})
    }
  }
  const refresh = async (): Promise<void> => {
    const current = session()
    if (current !== null && !navigation.pending()) {
      await go(current.document.location, {historyIndex: cursor(), preserveSelection: true})
    }
  }
  const find = async (query: string): Promise<void> => {
    setSearch(query)
    const result = await searching.run(() => request('code.list', {query}, filesSchema))
    if (result !== null) {
      setFiles(result.paths)
    }
  }
  useViewerConnection({port, receive, refresh, report, session})
  return {
    ...useOpenFile(port, receive, report),
    address: codeSelection.address,
    busy: navigation.pending,
    canBack: () => cursor() > 0,
    canForward: () => cursor() < history().length - 1,
    choices,
    copy,
    dismissNotice: dismiss,
    files,
    find,
    finding: searching.pending,
    follow,
    go,
    move,
    notice,
    refresh,
    search,
    selection: codeSelection.selection,
    selectLines: codeSelection.selectLines,
    selectText: codeSelection.selectText,
    session,
    share: codeSelection.share,
  }
}
