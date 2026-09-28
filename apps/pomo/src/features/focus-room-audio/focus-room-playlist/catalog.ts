import {audioFetch, httpFetch} from '../../http-client'
import type {LoadPTrackCatalogOptions, PTrack} from './model'

interface PTrackCollection {
  readonly tracks: readonly PTrack[]
  readonly version: number
}

const isString = (value: unknown): value is string => typeof value === 'string'

const isPTrack = (value: unknown): value is PTrack => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const track = value as Record<string, unknown>

  return (
    (track.artworkUrl === undefined || isString(track.artworkUrl)) &&
    isString(track.artist) &&
    typeof track.durationSeconds === 'number' &&
    Number.isFinite(track.durationSeconds) &&
    track.durationSeconds > 0 &&
    isString(track.id) &&
    isString(track.source) &&
    isString(track.title)
  )
}

const hasUniqueIds = (ids: readonly string[]) => new Set(ids).size === ids.length

const isPTrackCollection = (value: unknown): value is PTrackCollection => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const collection = value as Record<string, unknown>

  return (
    collection.version === 1 &&
    Array.isArray(collection.tracks) &&
    collection.tracks.every(isPTrack) &&
    hasUniqueIds(collection.tracks.map((track) => track.id))
  )
}

const createRequestInit = (signal?: AbortSignal): RequestInit => ({
  /* v8 ignore next -- Vitest compiles import.meta.env.DEV as one fixed execution mode. */
  cache: import.meta.env.DEV ? 'no-store' : 'default',
  signal,
})

/** Loads and validates the focus-room track catalog. */
export const loadPTrackCatalog = async (
  options: LoadPTrackCatalogOptions = {},
): Promise<readonly PTrack[]> => {
  const response =
    options.tracksUrl === undefined
      ? await audioFetch('tracks.json', createRequestInit(options.signal))
      : await httpFetch(options.tracksUrl, createRequestInit(options.signal))

  if (!response.ok) {
    throw new Error(`Focus-room tracks request failed: ${response.status}`)
  }

  const collection: unknown = await response.json()

  if (!isPTrackCollection(collection)) {
    throw new TypeError('Focus-room tracks have an invalid format')
  }

  return collection.tracks
}
