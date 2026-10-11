import type {NavigationKind} from '../shared/contracts'

export interface SymbolLookup {
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
