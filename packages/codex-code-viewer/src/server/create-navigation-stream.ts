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

export interface SymbolLookupOptions extends NavigationReview {
  readonly kind: NavigationKind
}
interface NavigationStreamOptions {
  readonly background: Pick<ReturnType<typeof createNavigationWorker>, 'scan'>
  readonly root: string
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
    const workspace: NavigationWorkspace = {
      definitions: (path, offset, sources) => options.symbols(path, offset, sources),
      followPath: options.followPath,
      references: (path, offset, sources) =>
        options.symbols(path, offset, sources, {...review, kind: 'references'}),
      root: options.root,
    }
    // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
    yield* streamNavigation({...input, document: document.value, signal, workspace})
  }
}
