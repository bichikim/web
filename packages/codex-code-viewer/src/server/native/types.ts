export interface NativeLocation {
  readonly path: string
  readonly line: number
  readonly column: number
}
export interface NativeQuery {
  readonly receiveOwnReferences?: (locations: readonly NativeLocation[]) => unknown
  readonly signal?: AbortSignal
  readonly sources?: ReadonlyMap<string, string>
  readonly document?: 'open' | 'disk'
  readonly file: string
  readonly source: string
  readonly offset: number
  readonly kind: 'definition' | 'references'
  readonly includeDeclaration?: boolean
  readonly receive?: (locations: readonly NativeLocation[]) => unknown
}
export interface NativeOptions {
  readonly concurrency?: number
  readonly binary: string
  readonly root: string
  readonly documents: readonly string[]
  readonly receive: (locations: readonly NativeLocation[]) => unknown
}
export interface SourcePoint {
  readonly file: string
  readonly source: string
  readonly offset: number
}

export interface NativePreparationOptions {
  readonly signal?: AbortSignal
  readonly dispatched?: () => void
}
