import {randomUUID} from 'node:crypto'
import {CancellationTokenSource, type MessageConnection, ProgressType} from 'vscode-jsonrpc/node.js'
import type {CodeLocation, Result, ViewerError} from '../../shared/contracts'
import type {SymbolLookup} from '../types'
import {withAbort} from '../with-abort'
import {offsetPosition} from './offset-position'
import {readDefinitionLocations} from './read-definition-locations'
interface RequestSymbolsOptions {
  readonly connection: MessageConnection
  readonly request: SymbolLookup
  readonly uri: string
  readonly source: string
  readonly offset: number
  readonly encoding?: 'utf-16' | 'utf-32'
  readonly failed: ViewerError['code']
}
/** Sends a semantic request with caller cancellation while retaining its language server. */
export const requestSymbols = async ({
  connection,
  request,
  uri,
  source,
  offset,
  encoding,
  failed,
}: RequestSymbolsOptions): Promise<Result<CodeLocation[]>> => {
  request.signal?.throwIfAborted()
  const cancellation = new CancellationTokenSource()
  const partialToken = request.receive === undefined ? undefined : randomUUID()
  const locations = new Map<string, CodeLocation>()
  let invalid = false
  const collect = (value: unknown): Result<CodeLocation[]> => {
    const result = readDefinitionLocations(value, failed)
    if (result.ok) {
      const found = result.value.filter((location) => {
        const key = JSON.stringify([location.path, location.line, location.column])
        if (locations.has(key)) {
          return false
        }
        locations.set(key, location)
        return true
      })
      if (found.length > 0 && !request.signal?.aborted) {
        request.receive?.(found)
      }
    }
    return result
  }
  const progress =
    partialToken === undefined
      ? undefined
      : connection.onProgress(new ProgressType<unknown>(), partialToken, (value) => {
          if (!request.signal?.aborted && !collect(value).ok) {
            invalid = true
            cancellation.cancel()
          }
        })
  const cancel = (): void => cancellation.cancel()
  request.signal?.addEventListener('abort', cancel, {once: true})
  try {
    const targets = await withAbort(
      connection.sendRequest<unknown>(
        `textDocument/${request.kind}`,
        {
          ...(request.kind === 'references' ? {context: {includeDeclaration: false}} : {}),
          position: offsetPosition(source, offset, encoding),
          textDocument: {uri},
          ...(partialToken === undefined ? {} : {partialResultToken: partialToken}),
        },
        cancellation.token,
      ),
      request.signal,
    )
    const result = collect(targets)
    return invalid || !result.ok
      ? readDefinitionLocations(undefined, failed)
      : {ok: true, value: [...locations.values()]}
  } finally {
    request.signal?.removeEventListener('abort', cancel)
    cancellation.dispose()
    progress?.dispose()
  }
}
