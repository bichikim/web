import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {
  musicAlbumCoverReservations,
  musicAlbums,
  musicAlbumTracks,
  musicAlbumTranslations,
  musicTrackAssets,
  musicTrackDeletionJobs,
  musicTrackRegistrations,
  musicTracks,
} from '../music'

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
