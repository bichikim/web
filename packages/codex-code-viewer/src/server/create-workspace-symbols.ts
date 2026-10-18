import {
  type CodeLocation,
  type CodeSource,
  failure,
  type Result,
  success,
} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import {readCodeSources} from './read-code-sources'
import {readSource, resolveFile} from './file-access'
import type {createSyntaxNavigation} from './create-syntax-navigation'
import type {SymbolLookupOptions} from './create-navigation-stream'
import type {NativeQuery} from './native/types'
interface WorkspaceSymbolsOptions {
  readonly code: (input: NativeQuery) => Promise<Result<CodeLocation[]>>
  readonly root: string
  readonly navigation: Pick<ReturnType<typeof createSyntaxNavigation>, 'has' | 'lookupSymbols'>
  readonly prepare: (path: string, signal: AbortSignal) => Promise<void>
  readonly refresh: () => void
  readonly signal: AbortSignal
}
const throwIfCancelled = (lookup: SymbolLookupOptions): void => {
  lookup.signal?.throwIfAborted()
  if (lookup.cancelled?.() === true) {
    throw new DOMException('Navigation aborted', 'AbortError')
  }
}
/** Resolves workspace symbols against synchronized source versions and owned analyzer contexts. */
export const createWorkspaceSymbols = ({
  root,
  navigation,
  prepare,
  refresh,
  signal,
  code,
}: WorkspaceSymbolsOptions) => {
  return (
    path: string,
    offset: number,
    drafts: readonly CodeSource[] = [],
    lookup: SymbolLookupOptions = {kind: 'definition'},
  ): Result<CodeLocation[]> | Promise<Result<CodeLocation[]>> => {
    throwIfCancelled(lookup)
    refresh()
    const {kind, retained = []} = lookup
    const sources = readCodeSources(root, drafts)
    if (!sources.ok) {
      return sources
    }
    const file = resolveFile(root, path)
    if (!file.ok) {
      return file
    }
    const draft = sources.value.get(file.value)
    const source = draft === undefined ? readSource(root, path) : success(draft)
    if (!source.ok) {
      return source
    }
    if (offset < 0 || offset >= source.value.length) {
      return failure('invalid-position')
    }
    const format = fileFormat(path)
    if (format?.kind === 'syntax' && navigation.has(format.language)) {
      return (
        lookup.synchronized === true ? Promise.resolve() : prepare(path, lookup.signal ?? signal)
      ).then(() =>
        navigation.lookupSymbols({
          draft: draft !== undefined,
          kind,
          offset,
          path: file.value,
          signal: lookup.signal,
          source: source.value,
          ...(lookup.receive === undefined ? {} : {receive: lookup.receive}),
        }),
      )
    }
    const unchanged = new Set(retained)
    const filter = (locations: readonly CodeLocation[]): CodeLocation[] =>
      locations.filter((location) => !unchanged.has(location.path))
    return code({
      file: file.value,
      kind,
      offset,
      receive: (locations) => {
        throwIfCancelled(lookup)
        return lookup.receive?.(filter(locations))
      },
      receiveOwnReferences:
        lookup.receiveOwnReferences === undefined
          ? undefined
          : (locations) => {
              throwIfCancelled(lookup)
              return lookup.receiveOwnReferences?.(filter(locations))
            },
      signal: lookup.signal ?? signal,
      source: source.value,
      sources: sources.value,
    }).then((result) => {
      throwIfCancelled(lookup)
      return result.ok ? success(filter(result.value)) : result
    })
  }
}
