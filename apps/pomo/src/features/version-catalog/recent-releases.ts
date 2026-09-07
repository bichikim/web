import type {VersionCatalog, VersionRelease} from './index'
import type {ViewedRelease} from './viewed-release-storage'

const RECENT_RELEASE_DAYS = 5
const HOURS_PER_DAY = 24
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1_000
const RECENT_RELEASE_DURATION_MS =
  RECENT_RELEASE_DAYS *
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND

interface SelectRecentUnseenReleasesOptions {
  readonly catalog: VersionCatalog
  readonly now: Date
  readonly viewedRelease: ViewedRelease | null
}

/** Selects unseen releases from the preceding five elapsed days. */
export const selectRecentUnseenReleases = (
  options: SelectRecentUnseenReleasesOptions,
): ReadonlyArray<VersionRelease> => {
  const now = options.now.getTime()
  const viewedAt =
    options.viewedRelease === null
      ? Number.NEGATIVE_INFINITY
      : Date.parse(options.viewedRelease.releasedAt)

  return options.catalog.releases
    .filter((release) => {
      const releasedAt = Date.parse(release.releasedAt)
      const age = now - releasedAt

      return age >= 0 && age < RECENT_RELEASE_DURATION_MS && releasedAt > viewedAt
    })
    .sort((left, right) => Date.parse(right.releasedAt) - Date.parse(left.releasedAt))
}
