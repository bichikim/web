import {createFeedRegistry, createHistoricalMomentsProvider} from 'src/features/feed-publisher'

import {historicalMomentsSource} from './historical-moments-source'

/** Creates the public feed registry for the current request origin. */
export const createPublicFeedRegistry = (request: Request) => {
  const {origin} = new URL(request.url)

  return createFeedRegistry([
    createHistoricalMomentsProvider({origin, source: historicalMomentsSource}),
  ])
}
