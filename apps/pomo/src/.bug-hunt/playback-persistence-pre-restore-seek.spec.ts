/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

const storageMocks = vi.hoisted(() => ({write: vi.fn()}))

vi.mock('../features/focus-room-audio/playback-storage', () => ({
  writePPlayback: storageMocks.write,
}))

import type {PTrack} from '../features/focus-room-audio/focus-room-playlist'
import {usePPlaybackPersistence} from '../features/focus-room-audio/use-focus-room-playback-persistence'

const TRACK = {id: 'track-1'} as PTrack

const createAudio = (
  currentTime: number,
  duration: number,
  readyState: number = HTMLMediaElement.HAVE_METADATA,
) => ({currentTime, duration, readyState}) as HTMLAudioElement

beforeEach(() => {
  storageMocks.write.mockReset().mockResolvedValue(undefined)
})

it('should not overwrite a user seek that happens before pending restore applies', () => {
  const audio = createAudio(0, 120)
  let track: PTrack | undefined = TRACK
  const persistence = usePPlaybackPersistence({
    currentTrack: () => track,
    getAudioElement: () => audio,
    isPlaying: () => true,
  })

  persistence.setPendingPosition({isPlaying: true, positionSeconds: 30, trackId: TRACK.id})

  audio.currentTime = 45
  persistence.persistSeekedPlayback()

  const restored = persistence.applyPendingPosition()

  expect(storageMocks.write).toHaveBeenCalledWith({
    isPlaying: true,
    positionSeconds: 45,
    trackId: TRACK.id,
  })
  expect(restored?.positionSeconds).toBe(45)
  expect(audio.currentTime).toBe(45)
})
