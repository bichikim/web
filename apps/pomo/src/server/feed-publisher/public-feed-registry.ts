import 'server-only'

import {createFeedRegistry, createHistoricalMomentsProvider} from 'src/features/feed-publisher'
import {historicalMomentsSource} from './historical-moments-source'

interface PublicFeedEnvironment {
  readonly POMO_PUBLIC_ORIGIN?: string
  readonly VERCEL_ENV?: string
}

const getPublicOrigin = (
  request: Request,
  environment: PublicFeedEnvironment = process.env,
): string => {
  if (environment.VERCEL_ENV !== 'production') {
    return new URL(request.url).origin
  }

  if (!environment.POMO_PUBLIC_ORIGIN?.trim()) {
    throw new TypeError('POMO_PUBLIC_ORIGIN is not set for production')
  }

  return new URL(environment.POMO_PUBLIC_ORIGIN).origin
}

/** Creates the public feed registry for the current deployment origin. */
export const createPublicFeedRegistry = (request: Request) => {
  const origin = getPublicOrigin(request)
  return createFeedRegistry([
    createHistoricalMomentsProvider({origin, source: historicalMomentsSource}),
  ])
}
