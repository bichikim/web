import {z} from 'zod'

import {getLocale, type Locale} from '@paraglide/runtime'
import {getPublicAssetUrl} from 'src/features/public-assets'

const VERSION_CATALOG_PATHS = {
  en: '/versions/en.json',
  ko: '/versions/ko.json',
} as const satisfies Record<Locale, `/${string}`>
const VERSION_PATTERN = /^\d{4}\. \d{2}\. \d{2} \d{2}:\d{2}$/u
const RELEASE_TIMESTAMP_PATTERN =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2})/u

const RELEASE_SCHEMA = z
  .object({
    changes: z.array(z.string().min(1)),
    releasedAt: z.string().datetime({offset: true}),
    title: z.string().min(1),
    version: z.string().regex(VERSION_PATTERN),
  })
  .refine(
    (release) => {
      const timestampParts = RELEASE_TIMESTAMP_PATTERN.exec(release.releasedAt)?.groups

      if (timestampParts === undefined) {
        return false
      }

      const {day, hour, minute, month, year} = timestampParts
      return release.version === `${year}. ${month}. ${day} ${hour}:${minute}`
    },
    {message: 'Version must match the zoned release timestamp.', path: ['version']},
  )

const VERSION_CATALOG_SCHEMA = z.object({
  releases: z.array(RELEASE_SCHEMA).min(1),
})

export interface VersionRelease {
  readonly changes: ReadonlyArray<string>
  readonly releasedAt: string
  readonly title: string
  readonly version: string
}

export interface VersionCatalog {
  readonly releases: ReadonlyArray<VersionRelease>
}

const parseVersionCatalog = (value: unknown): VersionCatalog => {
  const result = VERSION_CATALOG_SCHEMA.safeParse(value)

  if (!result.success) {
    throw new Error('Invalid version catalog.', {cause: result.error})
  }

  return result.data
}

/** Fetches and validates the public Pomofi version catalog. */
export const loadVersionCatalog = async (): Promise<VersionCatalog> => {
  let response: Response

  try {
    response = await fetch(getPublicAssetUrl(VERSION_CATALOG_PATHS[getLocale()]))
  } catch (error) {
    throw new Error('Failed to fetch version catalog.', {cause: error})
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch version catalog: ${response.status}`)
  }

  let value: unknown

  try {
    value = await response.json()
  } catch (error) {
    throw new Error('Failed to parse version catalog.', {cause: error})
  }

  return parseVersionCatalog(value)
}

export * from './recent-releases'
export * from './viewed-release-storage'
