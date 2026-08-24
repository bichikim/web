import {sql} from 'drizzle-orm'
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const musicAlbumStatusEnum = pgEnum('music_album_status', ['draft', 'published', 'archived'])
export const musicAlbumLocaleEnum = pgEnum('music_album_locale', ['ko', 'en', 'ja', 'zh-Hans'])
export const musicCoverFallbackEnum = pgEnum('music_cover_fallback', ['lp', 'cd', 'music'])
export const musicTrackAssetStatusEnum = pgEnum('music_track_asset_status', [
  'pending',
  'uploaded',
  'ready',
  'active',
  'failed',
  'retired',
  'deleted',
])

export const musicAlbums = pgTable(
  'music_albums',
  {
    coverFallback: musicCoverFallbackEnum().notNull().default('lp'),
    coverImageUrl: text(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    id: uuid().primaryKey().defaultRandom(),
    publishedAt: timestamp({withTimezone: true}),
    status: musicAlbumStatusEnum().notNull().default('draft'),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    check(
      'music_albums_cover_image_url_check',
      sql`${table.coverImageUrl} is null or ${table.coverImageUrl} like 'https://%'`,
    ),
    check(
      'music_albums_published_at_check',
      sql`(${table.status} = 'draft' and ${table.publishedAt} is null)
        or (${table.status} in ('published', 'archived') and ${table.publishedAt} is not null)`,
    ),
    index('music_albums_status_published_at_index').on(table.status, table.publishedAt),
  ],
)

export const musicAlbumTranslations = pgTable(
  'music_album_translations',
  {
    albumId: uuid()
      .notNull()
      .references(() => musicAlbums.id, {onDelete: 'cascade'}),
    description: text().notNull(),
    locale: musicAlbumLocaleEnum().notNull(),
    title: text().notNull(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({columns: [table.albumId, table.locale]}),
    index('music_album_translations_locale_album_id_index').on(table.locale, table.albumId),
  ],
)

export const musicTracks = pgTable('music_tracks', {
  artist: text().notNull(),
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
})

export const musicAlbumTracks = pgTable(
  'music_album_tracks',
  {
    albumId: uuid()
      .notNull()
      .references(() => musicAlbums.id, {onDelete: 'cascade'}),
    position: integer().notNull(),
    trackId: uuid()
      .notNull()
      .references(() => musicTracks.id, {onDelete: 'restrict'}),
  },
  (table) => [
    check('music_album_tracks_position_check', sql`${table.position} >= 0`),
    primaryKey({columns: [table.albumId, table.trackId]}),
    uniqueIndex('music_album_tracks_album_position_index').on(table.albumId, table.position),
  ],
)

export const musicTrackAssets = pgTable(
  'music_track_assets',
  {
    activatedAt: timestamp({withTimezone: true}),
    contentType: varchar({length: 64}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    deletedAt: timestamp({withTimezone: true}),
    durationMs: integer(),
    etag: varchar({length: 255}),
    failureCode: varchar({length: 64}),
    id: uuid().primaryKey().defaultRandom(),
    objectKey: text().notNull(),
    retiredAt: timestamp({withTimezone: true}),
    sizeBytes: bigint({mode: 'bigint'}),
    status: musicTrackAssetStatusEnum().notNull().default('pending'),
    storageRole: varchar({length: 32}).notNull().default('paid-private'),
    trackId: uuid()
      .notNull()
      .references(() => musicTracks.id, {onDelete: 'restrict'}),
    uploadedAt: timestamp({withTimezone: true}),
    validatedAt: timestamp({withTimezone: true}),
  },
  (table) => [
    check('music_track_assets_storage_role_check', sql`${table.storageRole} = 'paid-private'`),
    check(
      'music_track_assets_object_key_check',
      sql`${table.objectKey}
        = 'tracks/' || ${table.trackId}::text || '/' || ${table.id}::text || '/source.mp3'`,
    ),
    check(
      'music_track_assets_content_type_check',
      sql`${table.contentType} is null or ${table.contentType} = 'audio/mpeg'`,
    ),
    check(
      'music_track_assets_size_bytes_check',
      sql`${table.sizeBytes} is null or ${table.sizeBytes} > 0`,
    ),
    check(
      'music_track_assets_duration_ms_check',
      sql`${table.durationMs} is null or ${table.durationMs} > 0`,
    ),
    check(
      'music_track_assets_uploaded_metadata_check',
      sql`${table.status} not in ('uploaded', 'ready', 'active', 'retired', 'deleted')
        or (${table.contentType} is not null and ${table.sizeBytes} is not null
          and ${table.etag} is not null and ${table.uploadedAt} is not null)`,
    ),
    check(
      'music_track_assets_validated_metadata_check',
      sql`${table.status} not in ('ready', 'active', 'retired', 'deleted')
        or (${table.durationMs} is not null and ${table.validatedAt} is not null)`,
    ),
    check(
      'music_track_assets_activated_at_check',
      sql`${table.status} not in ('active', 'retired', 'deleted') or ${table.activatedAt} is not null`,
    ),
    check(
      'music_track_assets_retired_at_check',
      sql`${table.status} not in ('retired', 'deleted') or ${table.retiredAt} is not null`,
    ),
    check(
      'music_track_assets_deleted_at_check',
      sql`${table.status} <> 'deleted' or ${table.deletedAt} is not null`,
    ),
    check(
      'music_track_assets_failure_code_check',
      sql`${table.status} <> 'failed' or ${table.failureCode} is not null`,
    ),
    uniqueIndex('music_track_assets_object_key_index').on(table.objectKey),
    uniqueIndex('music_track_assets_active_track_index')
      .on(table.trackId)
      .where(sql`${table.status} = 'active'`),
    index('music_track_assets_status_created_at_index').on(table.status, table.createdAt),
  ],
)

export const musicTrackDeletionJobs = pgTable('music_track_deletion_jobs', {
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  objectKeys: jsonb().$type<readonly string[]>().notNull(),
  storageDeletedAt: timestamp({withTimezone: true}),
  trackId: uuid()
    .primaryKey()
    .references(() => musicTracks.id, {onDelete: 'cascade'}),
  updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
})
