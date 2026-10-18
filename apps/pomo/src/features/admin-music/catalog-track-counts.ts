import {uniqBy} from 'es-toolkit/array'
import {mapValues} from 'es-toolkit/map'
import {sumBy} from 'es-toolkit/math'

import type {AdminAsset, AdminTrack} from './catalog'

/** Indexes active asset counts by album, counting each distinct track's assets once per album. */
export const getCatalogTrackCounts = (catalog: {
  readonly assets: ReadonlyArray<AdminAsset>
  readonly tracks: ReadonlyArray<AdminTrack>
}): ReadonlyMap<string, number> => {
  const activeAssetsByTrack = Map.groupBy(
    catalog.assets.filter((asset) => asset.status === 'active'),
    (asset) => asset.trackId,
  )

  return mapValues(
    Map.groupBy(catalog.tracks, (track) => track.albumId),
    (tracks) =>
      sumBy(
        uniqBy(tracks, (track) => track.id),
        (track) => activeAssetsByTrack.get(track.id)?.length ?? 0,
      ),
  )
}
