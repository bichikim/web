import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  parseStoredAlbums,
  parseStoredTracks,
  storedAlbumSchema,
  type StoredCustomAlbum,
  type StoredCustomTrack,
  TRACK_STORE_NAME,
  waitForTransaction,
} from './database'
import {
  type CustomAlbumCoverUpdate,
  CustomAlbumError,
  isSupportedCustomAlbumCover,
  isSupportedCustomAudio,
  MAXIMUM_CUSTOM_ALBUM_BYTES,
  MAXIMUM_CUSTOM_COVER_BYTES,
  MAXIMUM_CUSTOM_LIBRARY_BYTES,
  MAXIMUM_CUSTOM_TRACK_BYTES,
  MAXIMUM_CUSTOM_TRACK_COUNT,
  type SaveCustomAlbumOptions,
} from './model'

interface AlbumWritePlan {
  readonly album: StoredCustomAlbum
  readonly trackIdsToDelete: readonly string[]
  readonly tracksToPut: readonly StoredCustomTrack[]
}

interface CreateAlbumWritePlanOptions {
  readonly albumId: string
  readonly availableBytes: number | null
  readonly existingAlbum: StoredCustomAlbum | null
  readonly existingTracks: readonly StoredCustomTrack[]
  readonly options: SaveCustomAlbumOptions
  readonly allAlbums: readonly StoredCustomAlbum[]
  readonly allTracks: readonly StoredCustomTrack[]
}

const getEstimatedAvailableBytes = async (): Promise<number | null> => {
  if (typeof globalThis.navigator === 'undefined' || globalThis.navigator.storage === undefined) {
    return null
  }

  try {
    const estimate = await globalThis.navigator.storage.estimate()

    if (estimate.quota === undefined || estimate.usage === undefined) {
      return null
    }

    return Math.max(0, estimate.quota - estimate.usage)
  } catch {
    return null
  }
}

const isQuotaExceeded = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'QuotaExceededError'

const validateCoverUpdate = (cover: CustomAlbumCoverUpdate): void => {
  switch (cover.kind) {
    case 'keep':
      return
    case 'replace':
      if (cover.image === null) {
        return
      }
      if (cover.image.size > MAXIMUM_CUSTOM_COVER_BYTES) {
        throw new CustomAlbumError('cover-too-large')
      }
      if (!isSupportedCustomAlbumCover(cover.image)) {
        throw new CustomAlbumError('invalid-cover')
      }
      return
  }

  cover satisfies never
}

const resolveCoverImage = (
  cover: CustomAlbumCoverUpdate,
  existingImage: Blob | undefined,
): Blob | undefined => {
  switch (cover.kind) {
    case 'keep':
      return existingImage
    case 'replace':
      return cover.image ?? undefined
  }

  cover satisfies never
  return undefined
}

const validateCustomAlbum = (options: SaveCustomAlbumOptions): void => {
  validateCoverUpdate(options.coverImage)
  const replacementCoverImage = resolveCoverImage(options.coverImage, undefined)

  if (options.title.trim().length === 0 || options.tracks.length > MAXIMUM_CUSTOM_TRACK_COUNT) {
    throw new CustomAlbumError('invalid-album')
  }

  const trackIds = new Set<string>()
  const albumBytes = options.tracks.reduce((total, track) => {
    if (
      track.audio.size <= 0 ||
      !isSupportedCustomAudio(track.audio, track.fileName) ||
      track.title.trim().length === 0 ||
      track.durationSeconds <= 0 ||
      !Number.isFinite(track.durationSeconds) ||
      trackIds.has(track.id)
    ) {
      throw new CustomAlbumError('invalid-album')
    }
    if (track.audio.size > MAXIMUM_CUSTOM_TRACK_BYTES) {
      throw new CustomAlbumError('track-too-large')
    }

    trackIds.add(track.id)
    return total + track.audio.size
  }, 0)

  if (albumBytes + (replacementCoverImage?.size ?? 0) > MAXIMUM_CUSTOM_ALBUM_BYTES) {
    throw new CustomAlbumError('album-too-large')
  }
}

const resolveExistingAlbum = (
  rawAlbum: unknown,
  albumId: string,
  requestedAlbumId: string | null,
): StoredCustomAlbum | null => {
  if (rawAlbum === undefined) {
    if (requestedAlbumId !== null) {
      throw new CustomAlbumError('album-missing')
    }

    return null
  }

  const result = storedAlbumSchema.safeParse(rawAlbum)

  if (!result.success) {
    throw new CustomAlbumError('corrupt-data', {cause: result.error})
  }
  if (requestedAlbumId === null || result.data.id !== albumId) {
    throw new CustomAlbumError('invalid-album')
  }

  return result.data
}

const createAlbumWritePlan = (options: CreateAlbumWritePlanOptions): AlbumWritePlan => {
  const {albumId, availableBytes, existingAlbum, existingTracks, options: input} = options
  const coverImage = resolveCoverImage(input.coverImage, existingAlbum?.coverImage)
  const otherTracks = options.allTracks.filter((track) => track.albumId !== albumId)
  const otherAlbums = options.allAlbums.filter((album) => album.id !== albumId)
  const otherTrackIds = new Set(otherTracks.map((track) => track.id))

  if (input.tracks.some((track) => otherTrackIds.has(track.id))) {
    throw new CustomAlbumError('invalid-album')
  }

  const retainedTrackIds = new Set(input.tracks.map((track) => track.id))
  const existingTrackIds = new Set(existingTracks.map((track) => track.id))
  const addedBytes = input.tracks
    .filter((track) => !existingTrackIds.has(track.id))
    .reduce((total, track) => total + track.audio.size, 0)
  const albumTrackBytes = input.tracks.reduce((total, track) => total + track.audio.size, 0)
  const currentAlbumBytes = albumTrackBytes + (coverImage?.size ?? 0)
  const libraryBytes =
    otherTracks.reduce((total, track) => total + track.audio.size, 0) +
    otherAlbums.reduce((total, album) => total + (album.coverImage?.size ?? 0), 0) +
    currentAlbumBytes
  const replacedCoverBytes =
    input.coverImage.kind === 'replace' ? (existingAlbum?.coverImage?.size ?? 0) : 0
  const addedCoverBytes =
    input.coverImage.kind === 'replace' ? (input.coverImage.image?.size ?? 0) : 0

  if (currentAlbumBytes > MAXIMUM_CUSTOM_ALBUM_BYTES) {
    throw new CustomAlbumError('album-too-large')
  }
  if (libraryBytes > MAXIMUM_CUSTOM_LIBRARY_BYTES) {
    throw new CustomAlbumError('library-too-large')
  }
  const removedTrackBytes = existingTracks
    .filter((track) => !retainedTrackIds.has(track.id))
    .reduce((total, track) => total + track.audio.size, 0)
  const bytesToRelease = removedTrackBytes + replacedCoverBytes
  const bytesToAdd = addedBytes + addedCoverBytes

  if (availableBytes !== null && bytesToAdd > availableBytes + bytesToRelease) {
    throw new CustomAlbumError('quota-exceeded')
  }

  const timestamp = Date.now()
  const album: StoredCustomAlbum = {
    artist: input.artist.trim(),
    coverIcon: input.coverIcon,
    coverSource: input.coverSource,
    ...(coverImage === undefined ? {} : {coverImage}),
    createdAt: existingAlbum?.createdAt ?? timestamp,
    id: albumId,
    title: input.title.trim(),
    trackIds: input.tracks.map((track) => track.id),
    updatedAt: timestamp,
  }
  const existingTracksById = new Map(existingTracks.map((track) => [track.id, track]))
  const tracksToPut = input.tracks.flatMap((track) => {
    const existingTrack = existingTracksById.get(track.id)
    const nextTrack: StoredCustomTrack = {
      albumId,
      artist: input.artist.trim(),
      audio: existingTrack?.audio ?? track.audio,
      durationSeconds: existingTrack?.durationSeconds ?? track.durationSeconds,
      fileName: existingTrack?.fileName ?? track.fileName,
      id: track.id,
      title: track.title.trim(),
    }

    return existingTrack === undefined || existingTrack.artist !== nextTrack.artist
      ? [nextTrack]
      : []
  })

  return {
    album,
    trackIdsToDelete: existingTracks
      .filter((track) => !retainedTrackIds.has(track.id))
      .map((track) => track.id),
    tracksToPut,
  }
}

const writeAlbumPlan = (
  albumStore: IDBObjectStore,
  trackStore: IDBObjectStore,
  plan: AlbumWritePlan,
): void => {
  for (const trackId of plan.trackIdsToDelete) {
    trackStore.delete(trackId)
  }
  for (const track of plan.tracksToPut) {
    trackStore.put(track)
  }

  albumStore.put(plan.album)
}

const scheduleAlbumWrite = (
  options: SaveCustomAlbumOptions,
  albumId: string,
  availableBytes: number | null,
): Promise<void> =>
  new Promise((resolve, reject) => {
    openCustomAlbumDatabase()
      .then((database) => {
        const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
        const albumStore = transaction.objectStore(ALBUM_STORE_NAME)
        const trackStore = transaction.objectStore(TRACK_STORE_NAME)
        const finished = waitForTransaction(transaction)
        const albumsRequest = albumStore.getAll()
        const tracksRequest = trackStore.getAll()
        let failure: unknown = null
        let completedReads = 0
        let rawAlbums: unknown[] = []
        let rawTracks: unknown[] = []

        const writeWhenRead = () => {
          completedReads += 1

          if (completedReads < 2) {
            return
          }

          try {
            const allAlbums = parseStoredAlbums(rawAlbums)
            const existingAlbum = resolveExistingAlbum(
              allAlbums.find((album) => album.id === albumId),
              albumId,
              options.albumId,
            )
            const allTracks = parseStoredTracks(rawTracks)
            const existingTracks = allTracks.filter((track) => track.albumId === albumId)
            const plan = createAlbumWritePlan({
              albumId,
              allAlbums,
              allTracks,
              availableBytes,
              existingAlbum,
              existingTracks,
              options,
            })

            writeAlbumPlan(albumStore, trackStore, plan)
          } catch (error: unknown) {
            failure = error
            transaction.abort()
          }
        }

        albumsRequest.onsuccess = () => {
          rawAlbums = albumsRequest.result
          writeWhenRead()
        }
        tracksRequest.onsuccess = () => {
          rawTracks = tracksRequest.result
          writeWhenRead()
        }

        finished.then(resolve, (error: unknown) => {
          const reason = failure ?? error
          reject(
            isQuotaExceeded(reason)
              ? new CustomAlbumError('quota-exceeded', {cause: reason})
              : reason,
          )
        })
      })
      .catch(reject)
  })

export const saveCustomAlbum = async (options: SaveCustomAlbumOptions): Promise<string> => {
  validateCustomAlbum(options)
  const albumId = options.albumId ?? `custom-album:${globalThis.crypto.randomUUID()}`
  const availableBytes = await getEstimatedAvailableBytes()

  await scheduleAlbumWrite(options, albumId, availableBytes)
  return albumId
}
