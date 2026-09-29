/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {PTrack} from '../features/focus-room-audio'
import {createPlayerQueueController} from '../components/media-player/create-player-queue-controller'

const createTrack = (id: string): PTrack => ({
  artist: 'Artist',
  durationSeconds: 120,
  id,
  source: `/tracks/${id}.mp3`,
  title: id,
})

const createHarness = (initialTracks: readonly PTrack[], initialIndex: number) => {
  const [tracks, setTracks] = createSignal<readonly PTrack[]>(initialTracks)
  const [currentIndex, setCurrentIndex] = createSignal(initialIndex)
  const controller = createPlayerQueueController({
    cancelPendingRestart: vi.fn(),
    clearPlaybackTransition: vi.fn(),
    isPlaying: () => true,
    isQueueControlled: () => false,
    onPlaybackRevisionChange: vi.fn(),
    order: {clearShuffleQueue: vi.fn(), resetOrder: vi.fn()},
    persistTrackQueue: vi.fn(),
    playback: {invalidate: vi.fn(), stop: vi.fn()},
    playbackPersistence: {
      persistCurrentPlayback: vi.fn(),
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

  return {controller, currentIndex, tracks}
}

it('should preserve the queue index when a catalog reload drops the active duplicate occurrence', () => {
  const defaultTracks = [createTrack('track-1'), createTrack('track-2'), createTrack('track-3')]
  const currentTracks = [
    createTrack('track-1'),
    createTrack('track-2'),
    createTrack('track-3'),
    createTrack('track-1'),
    createTrack('track-4'),
  ]
  const {controller, currentIndex} = createHarness(currentTracks, 3)

  controller.onLoad({defaultTracks, queueChanged: true})

  expect(currentIndex()).toBe(3)
})
