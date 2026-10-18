export interface LocalMarketplaceSource {
  readonly source_type: 'local'
  readonly source: string
}

export interface GitMarketplaceSource {
  readonly source_type: 'git'
  readonly source: string
  readonly ref?: string
  readonly sparse_paths?: readonly string[]
}

export type MarketplaceSource = LocalMarketplaceSource | GitMarketplaceSource
