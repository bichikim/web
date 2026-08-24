import 'server-only'

import {createFeedRegistry, createHistoricalMomentsProvider} from 'src/features/feed-publisher'
import {readEnum, readUrl} from '../environment/schema'
import {historicalMomentsSource} from './historical-moments-source'

export interface PublicFeedEnvironment {
  readonly POMO_PUBLIC_ORIGIN?: string
  readonly VERCEL_ENV?: string
}

const VERCEL_ENVIRONMENTS = ['development', 'preview', 'production'] as const

export const getPublicOrigin = (
  request: Request,
  environment: PublicFeedEnvironment = process.env,
): string => {
  const vercelEnvironment = readEnum(
    'VERCEL_ENV',
    environment.VERCEL_ENV,
    VERCEL_ENVIRONMENTS,
    'development',
  )

  if (vercelEnvironment !== 'production') {
    return new URL(request.url).origin
  }

  return readUrl('POMO_PUBLIC_ORIGIN', environment.POMO_PUBLIC_ORIGIN, {
    protocols: ['https:'],
  }).origin
}

/** Creates the public feed registry for the current deployment origin. */
export const createPublicFeedRegistry = (
  request: Request,
  environment: PublicFeedEnvironment = process.env,
) => {
  const origin = getPublicOrigin(request, environment)
  return createFeedRegistry([
    createHistoricalMomentsProvider({origin, source: historicalMomentsSource}),
  ])
}
