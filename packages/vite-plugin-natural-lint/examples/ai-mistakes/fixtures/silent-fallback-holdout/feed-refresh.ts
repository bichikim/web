interface FeedItem {
  readonly title: string
}

declare const requestFeed: () => Promise<readonly FeedItem[]>

export const refreshFeed = async (): Promise<readonly FeedItem[]> => {
  try {
    return await requestFeed()
  } catch (error: unknown) {
    console.error('Feed refresh failed.', error)
    return []
  }
}
