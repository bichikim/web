import {createCustomAlbumAudioFile, stubCustomAlbumAudioMetadata} from './support'
/** @vitest-environment node */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  albumByteLimit: 1000,
  embeddedCoverBytes: 200,
}))

vi.mock('src/features/custom-albums/model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/custom-albums/model')>()
  return {
    ...actual,
    MAXIMUM_CUSTOM_ALBUM_BYTES: mocks.albumByteLimit,
  }
})

vi.mock('src/features/custom-albums/read-embedded-audio-cover', () => ({
  readEmbeddedAudioCover: vi.fn(
    async () => new Blob([new Uint8Array(mocks.embeddedCoverBytes)], {type: 'image/jpeg'}),
  ),
}))

beforeEach(() => vi.stubGlobal('crypto', {randomUUID: () => 'track-1'}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

const addTrack = async () => {
  const {addCustomAlbumTracks} = await import('src/features/custom-albums')
  return addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [createCustomAlbumAudioFile(100)],
    readEmbeddedCover: false,
  })
}

const expectReleasedAudio = (audio: ReturnType<typeof stubCustomAlbumAudioMetadata>) => {
  expect(audio.removeAttribute).toHaveBeenCalledExactlyOnceWith('src')
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:audio')
  const deliveries = audio.delivered.mock.calls.length
  audio.dispatchEvent(new Event('loadedmetadata'))
  audio.dispatchEvent(new Event('error'))
  expect(audio.delivered).toHaveBeenCalledTimes(deliveries)
  expect(audio.removeAttribute).toHaveBeenCalledOnce()
  expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
}

it('should retain valid tracks and omit embedded artwork that would exceed the album limit', async () => {
  stubCustomAlbumAudioMetadata()

  const {addCustomAlbumTracks} = await import('src/features/custom-albums')
  const {readEmbeddedAudioCover} =
    await import('src/features/custom-albums/read-embedded-audio-cover')
  const result = await addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [createCustomAlbumAudioFile(mocks.albumByteLimit - 100)],
    readEmbeddedCover: true,
  })

  expect(readEmbeddedAudioCover).toHaveBeenCalledOnce()
  expect(result.kind).toBe('added')
  if (result.kind !== 'added') {
    throw new Error('Expected the valid track to be added.')
  }
  expect(result.tracks).toHaveLength(1)
  expect(result.embeddedCoverImage).toBeNull()
})

it('should retain embedded artwork when the persisted album is exactly at the byte limit', async () => {
  stubCustomAlbumAudioMetadata()

  const {addCustomAlbumTracks} = await import('src/features/custom-albums')
  const result = await addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [createCustomAlbumAudioFile(mocks.albumByteLimit - mocks.embeddedCoverBytes)],
    readEmbeddedCover: true,
  })

  expect(result.kind).toBe('added')
  if (result.kind !== 'added') {
    throw new Error('Expected the track at the exact byte limit to be added.')
  }
  expect(result.embeddedCoverImage?.size).toBe(mocks.embeddedCoverBytes)
})

it('should release metadata listeners and the source after a successful duration read', async () => {
  const audio = stubCustomAlbumAudioMetadata()
  audio.duration = 60.6
  const result = await addTrack()
  expect(result).toMatchObject({kind: 'added', tracks: [{durationSeconds: 61}]})
  expectReleasedAudio(audio)
})

it('should accept the half-second boundary after rounding and release the source', async () => {
  const audio = stubCustomAlbumAudioMetadata({durationSeconds: 0.5})
  await expect(addTrack()).resolves.toMatchObject({kind: 'added', tracks: [{durationSeconds: 1}]})
  expectReleasedAudio(audio)
})

it.each([NaN, Infinity, 0, -1, 0.4])(
  'should reject invalid duration %s and release the audio source',
  async (duration) => {
    const audio = stubCustomAlbumAudioMetadata()
    audio.duration = duration
    await expect(addTrack()).rejects.toMatchObject({code: 'invalid-audio'})
    expectReleasedAudio(audio)
  },
)

it('should reject a media error and release both subscriptions', async () => {
  const audio = stubCustomAlbumAudioMetadata()
  audio.load.mockImplementation(() => audio.dispatchEvent(new Event('error')))
  await expect(addTrack()).rejects.toMatchObject({code: 'invalid-audio'})
  expectReleasedAudio(audio)
})

it.each(['source', 'load'] as const)(
  'should preserve a synchronous %s failure and release audio resources',
  async (failure) => {
    const audio = stubCustomAlbumAudioMetadata()
    const error = new Error('Audio setup failed')
    const fail = () => {
      throw error
    }
    if (failure === 'source') {
      Object.defineProperty(audio, 'src', {get: () => '', set: fail})
    } else {
      audio.load.mockImplementation(fail)
    }
    await expect(addTrack()).rejects.toBe(error)
    expectReleasedAudio(audio)
  },
)
