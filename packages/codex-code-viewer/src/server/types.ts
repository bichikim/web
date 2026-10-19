import type {CodeLocation, NavigationKind} from '../shared/contracts'
import type {NavigationReview} from './navigation-cache/types'

export interface SymbolProgress {
  readonly signal?: AbortSignal
  readonly receive?: (locations: readonly CodeLocation[]) => void | Promise<void>
}
export interface ReferenceLookup extends NavigationReview, SymbolProgress {}
export interface DefinitionProgress extends SymbolProgress {
  readonly receiveOwnReferences?: SymbolProgress['receive']
  readonly cancelled?: () => boolean
}
export type DefinitionLookup = DefinitionProgress | (() => boolean)
export interface SymbolLookup extends SymbolProgress {
  readonly kind: NavigationKind
  readonly draft?: boolean
}
export interface SymbolQuery extends SymbolLookup {
  readonly path: string
  readonly source: string
  readonly offset: number
}

export interface SourceChange {
  readonly path: string
  readonly kind: 'created' | 'changed' | 'deleted'
}
