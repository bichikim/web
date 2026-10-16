import type {
  CodeSource,
  NavigationInput,
  NavigationKind,
  NavigationResult,
} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import type {createDocumentReader} from './create-document-reader'
import type {createNavigationWorker} from './create-navigation-worker'
import type {NavigationWorkspace} from './resolve-navigation'
import {streamNavigation} from './stream-navigation'
import type {NavigationReview} from './navigation-cache'
import type {ReferenceLookup} from './types'

export interface SymbolLookupOptions extends ReferenceLookup {
  readonly receiveOwnReferences?: ReferenceLookup['receive']
  readonly synchronized?: boolean
  readonly signal?: AbortSignal
  readonly kind: NavigationKind
}
interface NavigationStreamOptions {
  readonly background: Pick<ReturnType<typeof createNavigationWorker>, 'scan'>
  readonly root: string
  readonly prepare: (path: string, signal: AbortSignal) => Promise<void>
  readonly read: ReturnType<typeof createDocumentReader>['read']
  readonly followPath: NavigationWorkspace['followPath']
  readonly symbols: (
    path: string,
    offset: number,
    sources?: readonly CodeSource[],
    options?: SymbolLookupOptions,
  ) => ReturnType<NavigationWorkspace['definitions']>
}

/** Runs TypeScript analysis in a worker while retaining ownership of external language servers. */
export const createNavigationStream = (options: NavigationStreamOptions) => {
  return async function* createNavigationStream(
    input: NavigationInput,
    signal: AbortSignal,
    review: NavigationReview = {},
  ): AsyncGenerator<NavigationResult> {
    const format = fileFormat(input.path)
    if (format?.kind !== 'syntax') {
      // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
      yield* options.background.scan(input, signal, review)
      return
    }
    const document = options.read(input.path)
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    if (document.value.revision !== input.revision) {
      throw new Error('stale-document')
    }
    await options.prepare(input.path, signal)
    const workspace: NavigationWorkspace = {
      definitions: (path, offset, sources, progress) => {
        const request = typeof progress === 'function' ? {cancelled: progress} : progress
        return options.symbols(path, offset, sources, {
          ...request,
          kind: 'definition',
          signal: request?.signal ?? signal,
          synchronized: true,
        })
      },
      followPath: (path, offset, sources) => options.followPath(path, offset, sources, signal),
      references: (path, offset, sources, progress) =>
        options.symbols(path, offset, sources, {
          ...review,
          ...progress,
          kind: 'references',
          signal: progress?.signal ?? signal,
          synchronized: true,
        }),
      root: options.root,
    }
    // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
    yield* streamNavigation({...input, document: document.value, signal, workspace})
  }
}
