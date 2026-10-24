import {createHash, timingSafeEqual} from 'node:crypto'

import {env} from 'src/env'

/** Checks the Vercel Cron bearer token without exposing the configured secret. */
export const isAuthorizedCronRequest = (request: Request): boolean => {
  const actual = request.headers.get('authorization')

  if (actual === null) {
    return false
  }

  const expectedDigest = createHash('sha256').update(`Bearer ${env.CRON_SECRET}`).digest()
  const actualDigest = createHash('sha256').update(actual).digest()

  return timingSafeEqual(expectedDigest, actualDigest)
}
