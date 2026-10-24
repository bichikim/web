export const ALBUM_RELEASE_BLOCKERS = ['tracks_missing_active_asset'] as const

export type AlbumReleaseBlocker = (typeof ALBUM_RELEASE_BLOCKERS)[number]

export interface GetAlbumReleaseReadinessOptions {
  readonly activeAssetTrackCount: number
  readonly trackCount: number
}

export interface AlbumReleaseReadiness {
  readonly blockers: ReadonlyArray<AlbumReleaseBlocker>
  readonly ready: boolean
}

/** Evaluates the server-authoritative minimum conditions for publishing a paid album. */
export const getAlbumReleaseReadiness = (
  options: GetAlbumReleaseReadinessOptions,
): AlbumReleaseReadiness => {
  const blockers: AlbumReleaseBlocker[] = []

  if (options.activeAssetTrackCount < options.trackCount) {
    blockers.push('tracks_missing_active_asset')
  }

  return {blockers, ready: blockers.length === 0}
}
