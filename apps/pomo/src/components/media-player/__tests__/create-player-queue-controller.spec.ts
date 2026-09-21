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

const createHarness = (initialTracks = INITIAL_TRACKS, initialIndex = 0) => {
  const [tracks, setTracks] = createSignal<readonly PTrack[]>(initialTracks)
  const [currentIndex, setCurrentIndex] = createSignal(initialIndex)
  const cancelPendingRestart = vi.fn()
  const invalidate = vi.fn()
  const persistCurrentPlayback = vi.fn()
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
      persistCurrentPlayback,
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

  return {
    cancelPendingRestart,
    controller,
    currentIndex,
    invalidate,
    persistCurrentPlayback,
    tracks,
  }
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

  it('should persist the current occurrence index when removing a preceding track', () => {
    const duplicateTracks = [createTrack('track-1'), createTrack('track-1'), createTrack('track-2')]
    const {controller, currentIndex, persistCurrentPlayback} = createHarness(duplicateTracks, 2)

    controller.removeTrackFromQueue(0)

    expect(currentIndex()).toBe(1)
    expect(persistCurrentPlayback).toHaveBeenCalledOnce()
  })
})

describe('onLoad', () => {
  it('should preserve the active duplicate occurrence when merging a changed queue', () => {
    const defaultTracks = [
      createTrack('track-1'),
      createTrack('track-2'),
      createTrack('track-3'),
      createTrack('track-1'),
    ]
    const currentTracks = [...defaultTracks, createTrack('track-4')]
    const {controller, currentIndex, tracks} = createHarness(currentTracks, 3)

    controller.onLoad({defaultTracks, queueChanged: true})

    expect(currentIndex()).toBe(3)
    expect(tracks()).toEqual(currentTracks)
  })

  it('should fall back to the matching track when merging moves it before the old index', () => {
    const defaultTracks = [createTrack('track-2'), createTrack('track-1'), createTrack('track-3')]
    const currentTracks = [createTrack('track-4'), createTrack('track-5'), createTrack('track-1')]
    const {controller, currentIndex} = createHarness(currentTracks, 2)

    controller.onLoad({defaultTracks, queueChanged: true})

    expect(currentIndex()).toBe(1)
  })
})
