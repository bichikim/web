import {success} from '../shared/contracts'
import type {createNavigationWorker} from './create-navigation-worker'
import type {createDocumentReader} from './create-document-reader'
import type {NativeQuery} from './native/types'

interface WorkerSymbolsOptions {
  readonly background: ReturnType<typeof createNavigationWorker>
  readonly read: ReturnType<typeof createDocumentReader>['read']
  readonly signal: AbortSignal
}
/** Resolves validated semantic queries through the retained workspace worker. */
export const createWorkerSymbols =
  ({background, read, signal}: WorkerSymbolsOptions) =>
  async (query: NativeQuery) => {
    const document = read(query.file)
    if (!document.ok) {
      return document
    }
    const found = []
    for await (const batch of background.scan(
      {
        navigation: 'definition',
        offset: query.offset,
        path: document.value.location.path,
        revision: document.value.revision,
        sources: [...(query.sources ?? [])].map(([path, source]) => ({path, source})),
      },
      query.signal ?? signal,
      {},
      query.kind,
    )) {
      found.push(...batch.locations)
      await query.receive?.(batch.locations)
    }
    return success(found)
  }
