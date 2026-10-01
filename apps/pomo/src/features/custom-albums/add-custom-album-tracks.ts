import {
  CUSTOM_TRACK_ID_PREFIX,
  CustomAlbumError,
  type CustomAlbumTrack,
  isSupportedCustomAudio,
  MAXIMUM_CUSTOM_ALBUM_BYTES,
  MAXIMUM_CUSTOM_TRACK_BYTES,
  MAXIMUM_CUSTOM_TRACK_COUNT,
} from './model'
import {readEmbeddedAudioCover} from './read-embedded-audio-cover'

export interface AddCustomAlbumTracksOptions {
  readonly currentAlbumBytes: number
  readonly currentTrackCount: number
  readonly files: readonly File[]
  readonly readEmbeddedCover: boolean
}

export type AddCustomAlbumTracksResult =
  | {
      readonly embeddedCoverImage: Blob | null
      readonly kind: 'added'
      readonly tracks: readonly CustomAlbumTrack[]
    }
  | {readonly kind: 'album-too-large'}
  | {readonly kind: 'file-type'}
  | {readonly kind: 'track-count'}
  | {readonly kind: 'track-too-large'}

const readAudioDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const audio = globalThis.document.createElement('audio')
    const source = globalThis.URL.createObjectURL(file)
    const cleanUp = () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('error', handleError)
      audio.removeAttribute('src')
      globalThis.URL.revokeObjectURL(source)
    }
    const handleLoadedMetadata = () => {
      const {duration} = audio
      const roundedDuration = Math.round(duration)
      cleanUp()

      if (!Number.isFinite(duration) || duration <= 0 || roundedDuration <= 0) {
        reject(new CustomAlbumError('invalid-audio'))
        return
      }

      resolve(roundedDuration)
    }
    const handleError = () => {
      cleanUp()
      reject(new CustomAlbumError('invalid-audio'))
    }

    audio.preload = 'metadata'
    audio.addEventListener('loadedmetadata', handleLoadedMetadata, {once: true})
    audio.addEventListener('error', handleError, {once: true})
    audio.src = source
    audio.load()
  })

const getTrackTitle = (fileName: string): string => fileName.replace(/\.[^.]+$/u, '').trim()

export const addCustomAlbumTracks = async (
  options: AddCustomAlbumTracksOptions,
): Promise<AddCustomAlbumTracksResult> => {
  if (options.files.some((file) => !isSupportedCustomAudio(file, file.name))) {
    return {kind: 'file-type'}
  }
  if (options.files.some((file) => file.size <= 0 || file.size > MAXIMUM_CUSTOM_TRACK_BYTES)) {
    return {kind: 'track-too-large'}
  }
  if (options.currentTrackCount + options.files.length > MAXIMUM_CUSTOM_TRACK_COUNT) {
    return {kind: 'track-count'}
  }

  const addedBytes = options.files.reduce((total, file) => total + file.size, 0)
  if (options.currentAlbumBytes + addedBytes > MAXIMUM_CUSTOM_ALBUM_BYTES) {
    return {kind: 'album-too-large'}
  }

  const tracks = await Promise.all(
    options.files.map(async (file) => ({
      audio: file,
      durationSeconds: await readAudioDuration(file),
      fileName: file.name,
      id: `${CUSTOM_TRACK_ID_PREFIX}${globalThis.crypto.randomUUID()}`,
      title: getTrackTitle(file.name) || file.name,
    })),
  )
  const embeddedCoverCandidate = options.readEmbeddedCover
    ? await readFirstEmbeddedAudioCover(options.files)
    : null
  const embeddedCoverImage =
    embeddedCoverCandidate !== null &&
    options.currentAlbumBytes + addedBytes + embeddedCoverCandidate.size >
      MAXIMUM_CUSTOM_ALBUM_BYTES
      ? null
      : embeddedCoverCandidate

  return {embeddedCoverImage, kind: 'added', tracks}
}

const readFirstEmbeddedAudioCover = (files: readonly File[]): Promise<Blob | null> =>
  files.reduce<Promise<Blob | null>>(
    (coverImagePromise, file) =>
      coverImagePromise.then((coverImage) =>
        coverImage === null ? readEmbeddedAudioCover(file) : coverImage,
      ),
    Promise.resolve(null),
  )
