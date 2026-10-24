/** @vitest-environment node */
import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'
import {ALBUM_STATUSES, TRACK_ASSET_STATUSES} from 'src/features/admin-music/catalog-values'

import {
  musicAlbumCoverReservations,
  musicAlbums,
  musicAlbumStatusEnum,
  musicAlbumTracks,
  musicAlbumTranslations,
  musicTrackAssets,
  musicTrackAssetStatusEnum,
  musicTrackDeletionJobs,
  musicTrackRegistrations,
  musicTracks,
} from '../music'

it('should keep constructor-owned database enum arrays separate from the shared declarations', () => {
  expect(musicAlbumStatusEnum.enumValues).not.toBe(ALBUM_STATUSES)
  expect(musicTrackAssetStatusEnum.enumValues).not.toBe(TRACK_ASSET_STATUSES)
})

it('should retain the ordered album enum and its required draft default', () => {
  expect(musicAlbumStatusEnum.enumName).toBe('music_album_status')
  expect(musicAlbumStatusEnum.enumValues).toEqual(['draft', 'published', 'archived'])
  expect(musicAlbums.status.enumValues).toBe(musicAlbumStatusEnum.enumValues)
  expect(musicAlbums.status.default).toBe('draft')
  expect(musicAlbums.status.notNull).toBe(true)
})

it('should retain the ordered track asset enum and its required pending default', () => {
  expect(musicTrackAssetStatusEnum.enumName).toBe('music_track_asset_status')
  expect(musicTrackAssetStatusEnum.enumValues).toEqual([
    'pending',
    'uploaded',
    'ready',
    'active',
    'failed',
    'retired',
    'deleted',
  ])
  expect(musicTrackAssets.status.enumValues).toBe(musicTrackAssetStatusEnum.enumValues)
  expect(musicTrackAssets.status.default).toBe('pending')
  expect(musicTrackAssets.status.notNull).toBe(true)
})

it.each([
  [musicAlbums, 3],
  [musicAlbumCoverReservations, 4],
  [musicAlbumTranslations, 2],
  [musicTracks, 0],
  [musicAlbumTracks, 3],
  [musicTrackRegistrations, 1],
  [musicTrackAssets, 15],
  [musicTrackDeletionJobs, 0],
])('should expose the table constraints and indexes', (table, expectedConstraintCount) => {
  const config = getTableConfig(table)

  for (const foreignKey of config.foreignKeys) {
    expect(foreignKey.getName()).toMatch(/_fk$/u)
  }

  expect(config.indexes.length + config.checks.length + config.primaryKeys.length).toBe(
    expectedConstraintCount,
  )
})
