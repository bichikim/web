import quoteData from './quotes.json'

interface DevFeedQuote {
  readonly source: string
  readonly text: string
}

export const DEV_FEED_QUOTES: ReadonlyArray<DevFeedQuote> = quoteData
