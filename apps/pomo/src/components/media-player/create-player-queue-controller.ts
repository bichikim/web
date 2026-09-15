import {type Accessor, batch} from 'solid-js'

import {
  appendUniqueTracks,
  createInitialPlaybackState,
  type PAudioVisualizer,
  type PPlaybackPersistence,
  type PPlaybackState,
  type PTrack,
  resolvePlaybackRestore,
  resolveTrackRemoval,
} from '../../features/focus-room-audio'
import type {PreviewPlayback} from './preview-playback'
import type {Playback} from './use-playback'
import type {PlaylistLoad} from './use-playlist-restoration'
import type {PlaybackOrder} from './use-playback-order'

export interface CreatePlayerQueueControllerOptions {
  readonly cancelPendingRestart: () => void
  readonly isPlaying: Accessor<boolean>
  readonly isQueueControlled: Accessor<boolean>
  readonly onPlaybackRevisionChange: () => void
  readonly order: Pick<PlaybackOrder, 'clearShuffleQueue' | 'resetOrder'>
  readonly persistTrackQueue: (tracks: readonly PTrack[]) => void
  readonly playback: Pick<Playback, 'invalidate' | 'stop'>
  readonly playbackPersistence: Pick<
    PPlaybackPersistence,
    'persistStoppedPlayback' | 'setPendingPosition' | 'writePlayback'
  >
  readonly previewPlayback: Pick<PreviewPlayback, 'preventResume'>
  readonly readCurrentIndex: Accessor<number>
  readonly readTracks: Accessor<readonly PTrack[]>
  readonly restorePendingPlayback: () => void
  readonly setCurrentIndex: (index: number) => void
  readonly setLoadedTracks: (tracks: readonly PTrack[]) => void
  readonly visualizer: Pick<PAudioVisualizer, 'stop'>
}

export interface PlayerQueueController {
  readonly addTracksToQueue: (tracks: readonly PTrack[]) => void
  readonly clearTrackQueue: () => void
  readonly initializePlayback: (tracks: readonly PTrack[], playback: PPlaybackState | null) => void
  readonly onLoad: (loaded: PlaylistLoad) => readonly PTrack[]
  readonly queueRevision: Accessor<number>
  readonly removeTrackFromQueue: (removeIndex: number) => void
}

/** Coordinates playlist state changes without owning transport or navigation policy. */
export const createPlayerQueueController = (
  options: CreatePlayerQueueControllerOptions,
): PlayerQueueController => {
  let queueRevision = 0
  let initialPlaylistResolved = options.isQueueControlled()
  let clearedBeforeLoad = false
  const removedBeforeLoad = new Set<string>()

  const initializePlayback = (
    nextTracks: readonly PTrack[],
    storedPlayback: PPlaybackState | null,
  ) => {
    const fallbackIndex =
      storedPlayback === null
        ? createInitialPlaybackState({trackCount: nextTracks.length}).currentIndex
        : options.readCurrentIndex()
    const restoration = resolvePlaybackRestore({
      fallbackIndex,
      storedPlayback,
      tracks: nextTracks,
    })

    options.playbackPersistence.setPendingPosition(restoration.playback)
    batch(() => {
      options.setLoadedTracks(nextTracks)
      options.setCurrentIndex(restoration.currentIndex)
    })
    options.order.resetOrder()

    if (restoration.shouldPersist && restoration.playback !== null) {
      options.playbackPersistence.writePlayback(restoration.playback)
    }

    queueMicrotask(options.restorePendingPlayback)
  }

  const addTracksToQueue = (tracksToAdd: readonly PTrack[]) => {
    if (options.isQueueControlled() || tracksToAdd.length === 0) {
      return
    }

    const currentTracks = options.readTracks()
    const nextTracks = appendUniqueTracks(currentTracks, tracksToAdd)

    if (nextTracks === currentTracks) {
      return
    }

    queueRevision += 1
    options.setLoadedTracks(nextTracks)
    options.persistTrackQueue(nextTracks)
    options.order.resetOrder()
  }

  const removeTrackFromQueue = (removeIndex: number) => {
    const currentTracks = options.readTracks()

    if (
      options.isQueueControlled() ||
      !Number.isInteger(removeIndex) ||
      removeIndex < 0 ||
      removeIndex >= currentTracks.length
    ) {
      return
    }

    const resolution = resolveTrackRemoval({
      currentIndex: options.readCurrentIndex(),
      removeIndex,
      trackCount: currentTracks.length,
    })
    const nextTracks = currentTracks.filter((_track, index) => index !== removeIndex)
    const removedTrack = currentTracks[removeIndex]
    const nextTrack = nextTracks[resolution.nextCurrentIndex]
    const shouldResume = options.isPlaying()

    if (!initialPlaylistResolved && removedTrack !== undefined) {
      removedBeforeLoad.add(removedTrack.id)
    }

    options.cancelPendingRestart()
    options.playback.invalidate()
    options.onPlaybackRevisionChange()
    queueRevision += 1

    if (resolution.currentTrackChanged && nextTrack !== undefined) {
      const nextPlayback = {isPlaying: shouldResume, positionSeconds: 0, trackId: nextTrack.id}
      options.playbackPersistence.setPendingPosition(nextPlayback)
      options.playbackPersistence.writePlayback(nextPlayback)
    }

    if (nextTrack === undefined) {
      options.visualizer.stop()
      options.playback.stop()
      options.playbackPersistence.persistStoppedPlayback()
      options.playbackPersistence.setPendingPosition(null)
    }

    batch(() => {
      options.setLoadedTracks(nextTracks)
      options.setCurrentIndex(resolution.nextCurrentIndex)
    })
    options.persistTrackQueue(nextTracks)
    options.order.resetOrder()

    if (nextTrack === undefined) {
      return
    }

    if (resolution.currentTrackChanged) {
      queueMicrotask(options.restorePendingPlayback)
    }
  }

  const clearTrackQueue = () => {
    const currentTracks = options.readTracks()

    if (options.isQueueControlled() || currentTracks.length === 0) {
      return
    }

    if (!initialPlaylistResolved) {
      clearedBeforeLoad = true
    }

    options.cancelPendingRestart()
    options.playback.invalidate()
    options.onPlaybackRevisionChange()
    queueRevision += 1
    options.previewPlayback.preventResume()
    options.visualizer.stop()
    options.playback.stop()
    options.playbackPersistence.persistStoppedPlayback()
    options.playbackPersistence.setPendingPosition(null)

    batch(() => {
      options.setLoadedTracks([])
      options.setCurrentIndex(0)
    })
    options.persistTrackQueue([])
    options.order.clearShuffleQueue()
  }

  const onLoad = (loaded: PlaylistLoad): readonly PTrack[] => {
    initialPlaylistResolved = true
    const availableTracks = clearedBeforeLoad
      ? []
      : loaded.defaultTracks.filter((track) => !removedBeforeLoad.has(track.id))

    if (!loaded.queueChanged) {
      initializePlayback(availableTracks, null)
      return availableTracks
    }

    const activeTrackId = options.readTracks()[options.readCurrentIndex()]?.id
    const mergedTracks = appendUniqueTracks(availableTracks, options.readTracks())
    const activeIndex = mergedTracks.findIndex((track) => track.id === activeTrackId)
    batch(() => {
      options.setLoadedTracks(mergedTracks)
      options.setCurrentIndex(activeIndex < 0 ? 0 : activeIndex)
    })
    options.persistTrackQueue(mergedTracks)
    options.order.resetOrder()
    return availableTracks
  }

  return {
    addTracksToQueue,
    clearTrackQueue,
    initializePlayback,
    onLoad,
    queueRevision: () => queueRevision,
    removeTrackFromQueue,
  }
}
