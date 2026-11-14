import type {AdminAlbum, AdminAsset, AdminTrack} from 'src/features/admin-music/catalog'

import {
  type AlbumReleaseReadiness,
  getAlbumReleaseReadiness,
} from '../repositories/music-admin/release-policy'

export interface AdminCatalogAlbum extends Omit<AdminAlbum, 'release'> {
  release: AlbumReleaseReadiness
}

export interface CreateAdminAlbumsOptions {
  readonly albums: ReadonlyArray<Omit<AdminAlbum, 'release' | 'translations'>>
  readonly assets: ReadonlyArray<Pick<AdminAsset, 'status' | 'trackId'>>
  readonly tracks: ReadonlyArray<Pick<AdminTrack, 'albumId' | 'id'>>
  readonly translations: ReadonlyArray<AdminAlbum['translations'][number]>
}

export const createAdminAlbums = (options: CreateAdminAlbumsOptions): AdminCatalogAlbum[] => {
  const {albums, assets, tracks, translations} = options
  const activeAssetTrackIds = new Set(
    assets.filter((asset) => asset.status === 'active').map((asset) => asset.trackId),
  )
  const tracksByAlbum = Map.groupBy(tracks, (track) => track.albumId)
  const translationsByAlbum = Map.groupBy(translations, (translation) => translation.albumId)

  return albums.map((album) => {
    const albumTracks = tracksByAlbum.get(album.id) ?? []

    return {
      ...album,
      release: getAlbumReleaseReadiness({
        activeAssetTrackCount: albumTracks.filter((track) => activeAssetTrackIds.has(track.id))
          .length,
        trackCount: albumTracks.length,
      }),
      translations: translationsByAlbum.get(album.id) ?? [],
    }
  })
}
