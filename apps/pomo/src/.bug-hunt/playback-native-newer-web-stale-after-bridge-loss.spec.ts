/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createPPlaybackStorage,
  type PlaybackStorageAdapter,
  type StoredPlaybackState,
} from '../features/focus-room-audio/playback-storage'

const createStorage = (usesTossStorage: () => boolean) => {
  let web: StoredPlaybackState | null = null
  let native: StoredPlaybackState | null = null

  const adapter = {
    readToss: vi.fn(async () => native),
    readWeb: vi.fn(() => web),
    usesTossStorage,
    writeToss: vi.fn(async (value: StoredPlaybackState) => {
      native = value
    }),
    writeWeb: vi.fn((value: StoredPlaybackState) => {
      web = value
      return null
    }),
  } satisfies PlaybackStorageAdapter

  return {adapter, getNative: () => native, getWeb: () => web, setNative: (value: StoredPlaybackState) => {
    native = value
  }, setWeb: (value: StoredPlaybackState) => {
    web = value
  }}
}

describe('playback storage after Toss bridge loss', () => {
  let usesNativeBridge = true
  let storage: ReturnType<typeof createStorage>
  let playbackStorage: ReturnType<typeof createPPlaybackStorage>

  beforeEach(() => {
    usesNativeBridge = true
    storage = createStorage(() => usesNativeBridge)
    playbackStorage = createPPlaybackStorage({now: () => 100}, storage.adapter, vi.fn())
  })

  it('should keep the newer native playback after the Toss bridge disappears', async () => {
    storage.setWeb({
      isPlaying: true,
      positionSeconds: 1,
      savedAt: 10,
      trackId: 'stale-web-track',
    })
    storage.setNative({
      isPlaying: true,
      positionSeconds: 9,
      savedAt: 20,
      trackId: 'newer-native-track',
    })

    await expect(playbackStorage.read()).resolves.toMatchObject({trackId: 'newer-native-track'})

    usesNativeBridge = false

    await expect(playbackStorage.read()).resolves.toMatchObject({trackId: 'newer-native-track'})
  })
})
