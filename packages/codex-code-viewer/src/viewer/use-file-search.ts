import {type Accessor, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import {type WorkspaceSession} from '../shared/contracts'
import {readWorkspaceStream} from './read-workspace-stream'
import type {ViewerPort} from './types'
import {useLatestRequest} from './use-latest-request'

interface UseFileSearchProps {
  readonly onError: (error: unknown) => void
  readonly port: ViewerPort
  readonly session: Accessor<WorkspaceSession | null>
}

const MAX_RESULTS = 100

/** Finds files in the active workspace and discards results when that workspace changes. */
export const useFileSearch = (props: UseFileSearchProps) => {
  const [files, setFiles] = createSignal<string[]>([])
  const [search, setSearch] = createSignal('')
  const searching = useLatestRequest(props.onError)
  let controller: AbortController | null = null
  const reset = (): void => {
    controller?.abort()
    searching.cancel()
    setFiles([])
  }
  const session = createMemo(() => props.session()?.session)
  createEffect(on(session, reset))
  onCleanup(reset)
  const find = async (query: string): Promise<void> => {
    reset()
    setSearch(query)
    const current = props.session()
    if (current === null) {
      return
    }
    const active = new AbortController()
    controller = active
    let matches = new Set<string>()
    await searching.run(() =>
      readWorkspaceStream({
        input: {query, session: current.session},
        name: 'code.list',
        port: props.port,
        receive: (batch) => {
          if (!active.signal.aborted && current.session === props.session()?.session) {
            if (batch.failed) {
              throw new Error('일부 폴더를 읽지 못해 검색 결과가 불완전합니다.')
            }
            batch.files.forEach((file) => matches.add(file.path))
            matches = new Set([...matches].sort().slice(0, MAX_RESULTS))
            setFiles([...matches])
          }
        },
        signal: active.signal,
      }),
    )
  }
  return {files, find, finding: searching.pending, reset, search}
}
