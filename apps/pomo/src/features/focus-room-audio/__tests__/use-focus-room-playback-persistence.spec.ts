/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

const storageMocks = vi.hoisted(() => ({write: vi.fn()}))

vi.mock('../playback-storage', () => ({writePPlayback: storageMocks.write}))

import type {PTrack} from '../focus-room-playlist'
import {usePPlaybackPersistence} from '../use-focus-room-playback-persistence'

const TRACK = {id: 'track-1'} as PTrack

const createHarness = () => {
  let audio: HTMLAudioElement | undefined
  let playing = true
  let track: PTrack | undefined
  const persistence = usePPlaybackPersistence({
    currentTrack: () => track,
    getAudioElement: () => audio,
    isPlaying: () => playing,
  })

  return {
    persistence,
    setAudio: (value: HTMLAudioElement | undefined) => {
      audio = value
    },
    setPlaying: (value: boolean) => {
      playing = value
    },
    setTrack: (value: PTrack | undefined) => {
      track = value
    },
  }
}

const createAudio = (currentTime: number, duration: number) =>
  ({currentTime, duration}) as HTMLAudioElement

beforeEach(() => {
  storageMocks.write.mockReset().mockResolvedValue(undefined)
})

it('should persist only valid current playback without overwriting a pending position', () => {
  const harness = createHarness()

  harness.persistence.persistCurrentPlayback()
  harness.setTrack(TRACK)
  harness.persistence.persistCurrentPlayback()
  harness.setAudio(createAudio(Number.NaN, 10))
  harness.persistence.persistCurrentPlayback()
  harness.persistence.setPendingPosition({isPlaying: false, positionSeconds: 3, trackId: TRACK.id})
  harness.setAudio(createAudio(4, 10))
  harness.persistence.persistCurrentPlayback()
  expect(storageMocks.write).not.toHaveBeenCalled()

  harness.persistence.setPendingPosition(null)
  harness.setAudio(createAudio(-2, 10))
  harness.setPlaying(false)
  harness.persistence.persistCurrentPlayback()
  expect(storageMocks.write).toHaveBeenCalledWith({
    isPlaying: false,
    positionSeconds: 0,
    trackId: TRACK.id,
  })
})

it('should restore a matching pending position and clamp it to finite duration', () => {
  const harness = createHarness()
  const audio = createAudio(0, 10)
  harness.setTrack(TRACK)
  harness.setAudio(audio)
  harness.persistence.setPendingPosition({isPlaying: true, positionSeconds: 12, trackId: TRACK.id})

  expect(harness.persistence.applyPendingPosition()).toEqual({
    isPlaying: true,
    positionSeconds: 10,
    trackId: TRACK.id,
  })
  expect(audio.currentTime).toBe(10)
  expect(harness.persistence.applyPendingPosition()).toBeNull()
})

it.each([Number.POSITIVE_INFINITY, 0])(
  'should keep the pending position when duration is %s',
  (duration) => {
    const harness = createHarness()
    harness.setTrack(TRACK)
    harness.setAudio(createAudio(0, duration))
    harness.persistence.setPendingPosition({
      isPlaying: true,
      positionSeconds: 12,
      trackId: TRACK.id,
    })

    expect(harness.persistence.applyPendingPosition()?.positionSeconds).toBe(12)
  },
)

it('should defer restoration until the track and writable media element are ready', () => {
  const harness = createHarness()
  harness.persistence.setPendingPosition({isPlaying: true, positionSeconds: 3, trackId: TRACK.id})
  expect(harness.persistence.applyPendingPosition()).toBeNull()
  harness.setTrack({...TRACK, id: 'other-track'})
  harness.setAudio(createAudio(0, 10))
  expect(harness.persistence.applyPendingPosition()).toBeNull()
  harness.setTrack(TRACK)
  harness.setAudio(
    Object.defineProperty({duration: 10}, 'currentTime', {
      get: () => 0,
      set: () => {
        throw new Error('metadata unavailable')
      },
    }) as HTMLAudioElement,
  )
  expect(harness.persistence.applyPendingPosition()).toBeNull()
})

it('should throttle progress persistence and ignore storage rejection', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(10_000)
  storageMocks.write.mockRejectedValue(new Error('storage unavailable'))
  const harness = createHarness()
  harness.setTrack(TRACK)
  harness.setAudio(createAudio(2, 10))

  harness.persistence.persistPlaybackProgress()
  harness.persistence.persistPlaybackProgress()
  expect(storageMocks.write).toHaveBeenCalledOnce()
  await Promise.resolve()

  vi.advanceTimersByTime(5_000)
  harness.persistence.persistPlaybackProgress()
  expect(storageMocks.write).toHaveBeenCalledTimes(2)
  vi.useRealTimers()
})
