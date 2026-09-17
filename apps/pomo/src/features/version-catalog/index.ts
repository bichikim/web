import {z} from 'zod'

import {getLocale, type Locale} from '@paraglide/runtime'
import {loadPublicJson, type PublicAssetPath} from 'src/features/public-assets'

const VERSION_CATALOG_PATHS = {
  en: '/versions/v2/en.json',
  ko: '/versions/v2/ko.json',
} as const satisfies Record<Locale, PublicAssetPath>
const VERSION_PATTERN = /^\d{4}\. \d{2}\. \d{2} \d{2}:\d{2}$/u
const RELEASE_TIMESTAMP_PATTERN =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2})/u

const RELEASE_SCHEMA = z
  .object({
    changes: z.array(
      z.union([
        z.object({description: z.string().min(1), title: z.string().min(1).optional()}),
        z
          .string()
          .min(1)
          .transform((description) => ({description})),
      ]),
    ),
    notes: z.array(z.string().min(1)).optional(),
    releasedAt: z.string().datetime({offset: true}),
    summary: z.string().min(1).optional(),
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

export interface VersionChange {
  readonly description: string
  readonly title?: string
}

export interface VersionRelease {
  readonly changes: ReadonlyArray<VersionChange>
  readonly notes?: ReadonlyArray<string>
  readonly releasedAt: string
  readonly summary?: string
  readonly title: string
  readonly version: string
}

export interface VersionCatalog {
  readonly releases: ReadonlyArray<VersionRelease>
}

/** Fetches and validates the public Pomofi version catalog. */
export const loadVersionCatalog = (): Promise<VersionCatalog> =>
  loadPublicJson(VERSION_CATALOG_PATHS[getLocale()], VERSION_CATALOG_SCHEMA, {
    formatFetchFailure: ({status}) =>
      status === undefined
        ? 'Failed to fetch version catalog.'
        : `Failed to fetch version catalog: ${status}`,
    formatInvalid: () => 'Invalid version catalog.',
    formatParseFailure: () => 'Failed to parse version catalog.',
  })

export * from './recent-releases'
export * from './viewed-release-storage'
