import {type Accessor, createSignal} from 'solid-js'
import {filesSchema, type WorkspaceSession} from '../shared/contracts'
import {createSessionRequest} from './create-session-request'
import type {ViewerPort} from './types'
import {useLatestRequest} from './use-latest-request'

interface FileSearchOptions {
  readonly onError: (error: unknown) => void
  readonly port: ViewerPort
  readonly session: Accessor<WorkspaceSession | null>
}

/** Finds files in the active workspace and discards results when that workspace changes. */
export const useFileSearch = (options: FileSearchOptions) => {
  const [files, setFiles] = createSignal<string[]>([])
  const [search, setSearch] = createSignal('')
  const request = createSessionRequest(options)
  const searching = useLatestRequest(options.onError)
  const find = async (query: string): Promise<void> => {
    setSearch(query)
    const result = await searching.run(() => request('code.list', {query}, filesSchema))
    if (result !== null) {
      setFiles(result.paths)
    }
  }
  const reset = (): void => {
    searching.cancel()
    setFiles([])
  }
  return {files, find, finding: searching.pending, reset, search}
}
