import {and, eq, max} from 'drizzle-orm'

import {
  getDatabase,
  musicAlbums,
  musicAlbumTracks,
  musicTrackAssets,
  musicTrackDeletionJobs,
  musicTrackRegistrations,
  musicTracks,
  withTransactionalDatabase,
} from '../database'
import {createTrackAssetKey} from './asset-key'

export interface CreatePendingTrackInput {
  readonly albumId: string
  readonly artist: string
  readonly title: string
}

export interface CompleteTrackRegistrationInput {
  readonly artworkUrl: string | null
  readonly assetId: string
  readonly durationMs: number
  readonly etag: string
  readonly sizeBytes: bigint
}

export const createPendingTrack = async (input: CreatePendingTrackInput) =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [album] = await transaction
        .select({id: musicAlbums.id})
        .from(musicAlbums)
        .where(eq(musicAlbums.id, input.albumId))
        .for('update')
        .limit(1)

      if (album === undefined) {
        return null
      }

      const [track] = await transaction
        .insert(musicTracks)
        .values({artist: input.artist, title: input.title})
        .returning({artist: musicTracks.artist, id: musicTracks.id, title: musicTracks.title})

      if (track === undefined) {
        throw new Error('Failed to create a music track')
      }

      await transaction
        .insert(musicTrackRegistrations)
        .values({albumId: input.albumId, trackId: track.id})
      return track
    }),
  )

export const reserveTrackAsset = async (trackId: string) =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [track] = await transaction
        .select({id: musicTracks.id})
        .from(musicTracks)
        .where(eq(musicTracks.id, trackId))
        .for('update')
        .limit(1)

      if (track === undefined) {
        return null
      }

      const [registration] = await transaction
        .select({trackId: musicTrackRegistrations.trackId})
        .from(musicTrackRegistrations)
        .where(eq(musicTrackRegistrations.trackId, trackId))
        .limit(1)

      if (registration === undefined) {
        return null
      }

      const [deletionJob] = await transaction
        .select({trackId: musicTrackDeletionJobs.trackId})
        .from(musicTrackDeletionJobs)
        .where(eq(musicTrackDeletionJobs.trackId, trackId))
        .limit(1)

      if (deletionJob !== undefined) {
        return null
      }

      const [pendingAsset] = await transaction
        .select({assetId: musicTrackAssets.id, objectKey: musicTrackAssets.objectKey})
        .from(musicTrackAssets)
        .where(and(eq(musicTrackAssets.trackId, trackId), eq(musicTrackAssets.status, 'pending')))
        .limit(1)

      if (pendingAsset !== undefined) {
        return pendingAsset
      }

      const assetId = crypto.randomUUID()
      const objectKey = createTrackAssetKey({assetId, trackId})
      await transaction.insert(musicTrackAssets).values({id: assetId, objectKey, trackId})
      return {assetId, objectKey}
    }),
  )

export const completeTrackRegistration = async (
  input: CompleteTrackRegistrationInput,
): Promise<boolean> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [asset] = await transaction
        .select({status: musicTrackAssets.status, trackId: musicTrackAssets.trackId})
        .from(musicTrackAssets)
        .where(eq(musicTrackAssets.id, input.assetId))
        .for('update')
        .limit(1)

      if (asset === undefined || asset.status !== 'pending') {
        return false
      }

      const [track] = await transaction
        .select({id: musicTracks.id})
        .from(musicTracks)
        .where(eq(musicTracks.id, asset.trackId))
        .for('update')
        .limit(1)

      if (track === undefined) {
        return false
      }

      const [deletionJob] = await transaction
        .select({trackId: musicTrackDeletionJobs.trackId})
        .from(musicTrackDeletionJobs)
        .where(eq(musicTrackDeletionJobs.trackId, asset.trackId))
        .limit(1)

      if (deletionJob !== undefined) {
        return false
      }

      const [registration] = await transaction
        .select({albumId: musicTrackRegistrations.albumId})
        .from(musicTrackRegistrations)
        .where(eq(musicTrackRegistrations.trackId, asset.trackId))
        .limit(1)

      if (registration === undefined) {
        return false
      }

      const [album] = await transaction
        .select({id: musicAlbums.id})
        .from(musicAlbums)
        .where(eq(musicAlbums.id, registration.albumId))
        .for('update')
        .limit(1)
      const [lockedRegistration] = await transaction
        .select({albumId: musicTrackRegistrations.albumId})
        .from(musicTrackRegistrations)
        .where(eq(musicTrackRegistrations.trackId, asset.trackId))
        .for('update')
        .limit(1)

      if (album === undefined || lockedRegistration?.albumId !== registration.albumId) {
        return false
      }

      const now = new Date()
      await transaction
        .update(musicTrackAssets)
        .set({retiredAt: now, status: 'retired'})
        .where(
          and(eq(musicTrackAssets.trackId, asset.trackId), eq(musicTrackAssets.status, 'active')),
        )
      const [activatedAsset] = await transaction
        .update(musicTrackAssets)
        .set({
          activatedAt: now,
          artworkUrl: input.artworkUrl,
          contentType: 'audio/mpeg',
          durationMs: input.durationMs,
          etag: input.etag,
          sizeBytes: input.sizeBytes,
          status: 'active',
          uploadedAt: now,
          validatedAt: now,
        })
        .where(and(eq(musicTrackAssets.id, input.assetId), eq(musicTrackAssets.status, 'pending')))
        .returning({id: musicTrackAssets.id})

      if (activatedAsset === undefined) {
        return false
      }

      const [positionResult] = await transaction
        .select({position: max(musicAlbumTracks.position)})
        .from(musicAlbumTracks)
        .where(eq(musicAlbumTracks.albumId, registration.albumId))
      const position = (positionResult?.position ?? -1) + 1
      await transaction.insert(musicAlbumTracks).values({
        albumId: registration.albumId,
        position,
        trackId: asset.trackId,
      })
      await transaction
        .delete(musicTrackRegistrations)
        .where(eq(musicTrackRegistrations.trackId, asset.trackId))

      return true
    }),
  )

export const failTrackAsset = async (assetId: string, failureCode: string): Promise<void> => {
  const database = getDatabase()
  await database
    .update(musicTrackAssets)
    .set({failureCode, status: 'failed'})
    .where(and(eq(musicTrackAssets.id, assetId), eq(musicTrackAssets.status, 'pending')))
}

export const findPendingTrackAsset = async (assetId: string) => {
  const database = getDatabase()
  const [asset] = await database
    .select({id: musicTrackAssets.id, objectKey: musicTrackAssets.objectKey})
    .from(musicTrackAssets)
    .where(and(eq(musicTrackAssets.id, assetId), eq(musicTrackAssets.status, 'pending')))
    .limit(1)

  return asset ?? null
}

export const findActiveTrackAsset = async (trackId: string) => {
  const database = getDatabase()
  const [asset] = await database
    .select({assetId: musicTrackAssets.id, objectKey: musicTrackAssets.objectKey})
    .from(musicTrackAssets)
    .where(and(eq(musicTrackAssets.trackId, trackId), eq(musicTrackAssets.status, 'active')))
    .limit(1)

  return asset ?? null
}
