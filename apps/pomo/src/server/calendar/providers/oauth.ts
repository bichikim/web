import {z} from 'zod'

import type {CalendarProviderTokens} from './types'

const tokenResponseSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'object' || value === null) {
      return value
    }

    const record = value as Readonly<Record<string, unknown>>
    return {
      accessToken: record['access_token'],
      expiresIn: record['expires_in'],
      refreshToken: record['refresh_token'],
    }
  },
  z.object({
    accessToken: z.string().min(1),
    expiresIn: z.number().positive().optional(),
    refreshToken: z.string().min(1).optional(),
  }),
)
const MILLISECONDS_PER_SECOND = 1000

interface RequestTokensOptions {
  readonly body: URLSearchParams
  readonly fetch: typeof globalThis.fetch
  readonly now: () => Date
  readonly tokenUrl: string
}

export const requestTokens = async (
  options: RequestTokensOptions,
): Promise<CalendarProviderTokens> => {
  const response = await options.fetch(options.tokenUrl, {
    body: options.body,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Calendar OAuth token request failed with status ${response.status}`)
  }

  const tokens = tokenResponseSchema.parse(await response.json())
  const expiresAt =
    tokens.expiresIn === undefined
      ? null
      : new Date(options.now().getTime() + tokens.expiresIn * MILLISECONDS_PER_SECOND).toISOString()

  return {
    accessToken: tokens.accessToken,
    expiresAt,
    refreshToken: tokens.refreshToken ?? null,
  }
}
