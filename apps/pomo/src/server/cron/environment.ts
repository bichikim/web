export interface CronEnvironment {
  readonly CRON_SECRET?: string
}

/** Returns the secret shared with Vercel Cron. */
export const getCronSecret = (environment: CronEnvironment = process.env): string => {
  const secret = environment.CRON_SECRET?.trim()

  if (!secret) {
    throw new TypeError('CRON_SECRET is not set')
  }

  return secret
}

/** Checks the Vercel Cron bearer token without exposing the configured secret. */
export const isAuthorizedCronRequest = (
  request: Request,
  environment: CronEnvironment = process.env,
): boolean => request.headers.get('authorization') === `Bearer ${getCronSecret(environment)}`
