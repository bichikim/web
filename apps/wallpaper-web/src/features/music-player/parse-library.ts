import type {MusicAlbum, MusicLibrary, MusicTrack} from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isLocalSource = (value: unknown): value is string => {
  if (!isText(value) || !value.startsWith('/music/')) {
    return false
  }
  return new URL(value, 'https://local.invalid').pathname.startsWith('/music/')
}

const hasUniqueIds = (values: readonly {readonly id: string}[]) =>
  new Set(values.map((value) => value.id)).size === values.length

const isTrack = (value: unknown): value is MusicTrack =>
  isRecord(value) &&
  isText(value.id) &&
  isText(value.title) &&
  isLocalSource(value.src) &&
  (value.artwork === undefined || isLocalSource(value.artwork)) &&
  (value.artist === undefined || isText(value.artist))

const isAlbum = (value: unknown): value is MusicAlbum =>
  isRecord(value) &&
  isText(value.id) &&
  isText(value.title) &&
  isText(value.artist) &&
  (value.artwork === undefined || isLocalSource(value.artwork)) &&
  Array.isArray(value.tracks) &&
  value.tracks.every(isTrack) &&
  hasUniqueIds(value.tracks)

export const parseLibrary = (value: unknown): MusicLibrary | null =>
  isRecord(value) &&
  value.version === 1 &&
  Array.isArray(value.albums) &&
  value.albums.every(isAlbum) &&
  hasUniqueIds(value.albums)
    ? {albums: value.albums, version: 1}
    : null
