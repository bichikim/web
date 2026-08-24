import 'server-only'

import {readString} from '../environment/schema'

export interface CronEnvironment {
  readonly CRON_SECRET?: string
}

const MINIMUM_CRON_SECRET_LENGTH = 16

/** Returns the secret shared with Vercel Cron. */
export const getCronSecret = (environment: CronEnvironment = process.env): string => {
  return readString('CRON_SECRET', environment.CRON_SECRET, {
    minimumLength: MINIMUM_CRON_SECRET_LENGTH,
  })
}

/** Checks the Vercel Cron bearer token without exposing the configured secret. */
export const isAuthorizedCronRequest = (
  request: Request,
  environment: CronEnvironment = process.env,
): boolean => request.headers.get('authorization') === `Bearer ${getCronSecret(environment)}`
