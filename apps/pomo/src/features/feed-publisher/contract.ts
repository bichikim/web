export const FEED_FORMATS = ['atom', 'rss'] as const

export type FeedFormat = (typeof FEED_FORMATS)[number]

export interface FeedDefinition {
  readonly description: string
  readonly homeUrl: string
  readonly language: string
  readonly slug: string
  readonly title: string
}

export interface FeedEntry {
  readonly contentHtml?: string
  readonly id: string
  readonly publishedAt: string
  readonly summary: string
  readonly title: string
  readonly updatedAt?: string
  readonly url: string
}

export interface FeedProvider {
  readonly definition: FeedDefinition
  readonly listEntries: () => Promise<ReadonlyArray<FeedEntry>>
}

export interface FeedRenderInput {
  readonly definition: FeedDefinition
  readonly entries: ReadonlyArray<FeedEntry>
  readonly selfUrl: string
  readonly updatedAt: string
}
