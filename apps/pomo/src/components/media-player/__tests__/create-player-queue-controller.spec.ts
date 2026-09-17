/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import type {PTrack} from '../../../features/focus-room-audio'
import {createPlayerQueueController} from '../create-player-queue-controller'

const createTrack = (id: string): PTrack => ({
  artist: 'Artist',
  durationSeconds: 120,
  id,
  source: `/tracks/${id}.mp3`,
  title: id,
})

const INITIAL_TRACKS = [createTrack('track-1'), createTrack('track-2'), createTrack('track-3')]

const createHarness = () => {
  const [tracks, setTracks] = createSignal<readonly PTrack[]>(INITIAL_TRACKS)
  const [currentIndex, setCurrentIndex] = createSignal(0)
  const cancelPendingRestart = vi.fn()
  const invalidate = vi.fn()
  const controller = createPlayerQueueController({
    cancelPendingRestart,
    clearPlaybackTransition: vi.fn(),
    isPlaying: () => true,
    isQueueControlled: () => false,
    onPlaybackRevisionChange: vi.fn(),
    order: {
      clearShuffleQueue: vi.fn(),
      resetOrder: vi.fn(),
    },
    persistTrackQueue: vi.fn(),
    playback: {
      invalidate,
      stop: vi.fn(),
    },
    playbackPersistence: {
      persistStoppedPlayback: vi.fn(),
      setPendingPosition: vi.fn(),
      writePlayback: vi.fn(),
    },
    prepareTrackChange: vi.fn(),
    previewPlayback: {preventResume: vi.fn()},
    readCurrentIndex: currentIndex,
    readTracks: tracks,
    restorePendingPlayback: vi.fn(),
    setCurrentIndex: (index) => setCurrentIndex(index),
    setLoadedTracks: (nextTracks) => setTracks(nextTracks),
    visualizer: {stop: vi.fn()},
  })

  return {cancelPendingRestart, controller, invalidate, tracks}
}

describe('removeTrackFromQueue', () => {
  it('should preserve the current playback restart when removing another track', () => {
    const {cancelPendingRestart, controller, invalidate, tracks} = createHarness()

    controller.removeTrackFromQueue(1)

    expect(cancelPendingRestart).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
    expect(tracks().map((track) => track.id)).toEqual(['track-1', 'track-3'])
  })

  it('should cancel current playback when removing the current track', () => {
    const {cancelPendingRestart, controller, invalidate} = createHarness()

    controller.removeTrackFromQueue(0)

    expect(cancelPendingRestart).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledOnce()
  })
})
