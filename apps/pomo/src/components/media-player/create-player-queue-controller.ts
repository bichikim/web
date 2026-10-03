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
import {
  createLegacyPlaylistEntryIds,
  createPlaylistEntryId,
  hasValidPlaylistEntryIds,
} from '../../features/focus-room-audio/playlist-entry'
import type {PreviewPlayback} from './preview-playback'
import type {Playback} from './use-playback'
import type {PlaylistLoad} from './use-playlist-restoration'
import type {PlaybackOrder} from './use-playback-order'

export interface CreatePlayerQueueControllerOptions {
  readonly cancelPendingRestart: () => void
  readonly clearPlaybackTransition: () => void
  readonly isPlaying: Accessor<boolean>
  readonly isQueueControlled: Accessor<boolean>
  readonly onPlaybackRevisionChange: () => void
  readonly order: Pick<PlaybackOrder, 'clearShuffleQueue' | 'resetOrder'>
  readonly prepareTrackChange: (shouldResume: boolean, trackId: string) => void
  readonly persistTrackQueue: (tracks: readonly PTrack[], entryIds: readonly string[]) => void
  readonly playback: Pick<Playback, 'invalidate' | 'stop'>
  readonly playbackPersistence: Pick<
    PPlaybackPersistence,
    'persistCurrentPlayback' | 'persistStoppedPlayback' | 'setPendingPosition' | 'writePlayback'
  >
  readonly previewPlayback: Pick<PreviewPlayback, 'preventResume'>
  readonly readCurrentIndex: Accessor<number>
  readonly readQueueEntryIds: Accessor<readonly string[]>
  readonly readTracks: Accessor<readonly PTrack[]>
  readonly restorePendingPlayback: () => void
  readonly setCurrentIndex: (index: number) => void
  readonly setLoadedEntryIds: (entryIds: readonly string[]) => void
  readonly setLoadedTracks: (tracks: readonly PTrack[]) => void
  readonly visualizer: Pick<PAudioVisualizer, 'stop'>
}

export interface PlayerQueueController {
  readonly addTracksToQueue: (tracks: readonly PTrack[]) => void
  readonly clearTrackQueue: () => void
  readonly initializePlayback: (
    tracks: readonly PTrack[],
    playback: PPlaybackState | null,
    entryIds?: readonly string[],
  ) => void
  readonly onLoad: (loaded: PlaylistLoad) => readonly PTrack[]
  readonly queueRevision: Accessor<number>
  readonly reorderTrackInQueue: (fromIndex: number, toIndex: number) => void
  readonly removeTrackFromQueue: (removeIndex: number) => void
}

const stopPlayback = (options: CreatePlayerQueueControllerOptions) => {
  options.visualizer.stop()
  options.playback.stop()
  options.playbackPersistence.persistStoppedPlayback()
  options.playbackPersistence.setPendingPosition(null)
}

const createPlaybackState = (
  track: PTrack,
  trackIndex: number,
  isPlaying: boolean,
  queueEntryId?: string,
): PPlaybackState => ({
  isPlaying,
  positionSeconds: 0,
  ...(queueEntryId === undefined ? {} : {queueEntryId}),
  trackId: track.id,
  trackIndex,
})

const persistShiftedCurrentPlayback = (
  options: Pick<CreatePlayerQueueControllerOptions, 'playbackPersistence'>,
  currentIndex: number,
  resolution: ReturnType<typeof resolveTrackRemoval>,
) => {
  if (!resolution.currentTrackChanged && resolution.nextCurrentIndex !== currentIndex) {
    options.playbackPersistence.persistCurrentPlayback()
  }
}

const findActiveTrackIndex = (
  currentTracks: readonly PTrack[],
  mergedTracks: readonly PTrack[],
  currentIndex: number,
) => {
  const activeTrackId = currentTracks[currentIndex]?.id
  const activeIndex = mergedTracks.findIndex(
    (track, index) => index >= currentIndex && track.id === activeTrackId,
  )

  if (activeIndex >= 0) {
    return activeIndex
  }

  const activeOccurrenceCount = currentTracks
    .slice(0, currentIndex + 1)
    .filter((track) => track.id === activeTrackId).length
  const mergedOccurrenceCount = mergedTracks.filter((track) => track.id === activeTrackId).length

  if (activeOccurrenceCount > mergedOccurrenceCount) {
    return mergedTracks.length === 0 ? -1 : Math.min(currentIndex, mergedTracks.length - 1)
  }

  return mergedTracks.findIndex((track) => track.id === activeTrackId)
}

const filterRemovedTrackOccurrences = (
  tracks: readonly PTrack[],
  removedTrackCounts: ReadonlyMap<string, number>,
) => {
  const remainingCounts = new Map(removedTrackCounts)
  return tracks.filter((track) => {
    const removedTrackCount = remainingCounts.get(track.id) ?? 0
    if (removedTrackCount === 0) {
      return true
    }

    remainingCounts.set(track.id, removedTrackCount - 1)
    return false
  })
}

const moveAtIndex = <Value>(values: readonly Value[], fromIndex: number, toIndex: number) => {
  const moved = [...values]
  const [value] = moved.splice(fromIndex, 1)
  if (value !== undefined) {
    moved.splice(toIndex, 0, value)
  }
  return moved
}

interface PlayerQueueControllerState {
  initialPlaylistResolved: boolean
  clearedBeforeLoad: boolean
  queueRevision: number
  removedBeforeLoad: Map<string, number>
}

const getPlaylistEntryIds = (
  options: CreatePlayerQueueControllerOptions,
  tracks: readonly PTrack[],
) => {
  const trackIds = tracks.map((track) => track.id)
  const entryIds = options.readQueueEntryIds()
  return hasValidPlaylistEntryIds(trackIds, entryIds)
    ? entryIds
    : createLegacyPlaylistEntryIds(trackIds)
}

const initializeQueuePlayback = (
  options: CreatePlayerQueueControllerOptions,
  nextTracks: readonly PTrack[],
  storedPlayback: PPlaybackState | null,
  storedEntryIds?: readonly string[],
) => {
  const trackIds = nextTracks.map((track) => track.id)
  const entryIds = hasValidPlaylistEntryIds(trackIds, storedEntryIds)
    ? storedEntryIds
    : createLegacyPlaylistEntryIds(trackIds)
  const fallbackIndex =
    storedPlayback === null
      ? createInitialPlaybackState({trackCount: nextTracks.length}).currentIndex
      : options.readCurrentIndex()
  const restoration = resolvePlaybackRestore({
    fallbackIndex,
    queueEntryIds: entryIds,
    storedPlayback,
    tracks: nextTracks,
  })

  options.playbackPersistence.setPendingPosition(restoration.playback)
  batch(() => {
    options.setLoadedTracks(nextTracks)
    options.setLoadedEntryIds(entryIds)
    options.setCurrentIndex(restoration.currentIndex)
  })
  options.order.resetOrder()

  if (restoration.shouldPersist && restoration.playback !== null) {
    options.playbackPersistence.writePlayback(restoration.playback)
  }

  queueMicrotask(options.restorePendingPlayback)
}

const addTracksToQueue = (
  options: CreatePlayerQueueControllerOptions,
  state: PlayerQueueControllerState,
  tracksToAdd: readonly PTrack[],
) => {
  if (options.isQueueControlled() || tracksToAdd.length === 0) {
    return
  }

  const currentTracks = options.readTracks()
  const nextTracks = appendUniqueTracks(currentTracks, tracksToAdd)
  if (nextTracks === currentTracks) {
    return
  }

  const currentEntryIds = getPlaylistEntryIds(options, currentTracks)
  const nextEntryIds = [
    ...currentEntryIds,
    ...nextTracks.slice(currentTracks.length).map(() => createPlaylistEntryId()),
  ]
  state.queueRevision += 1
  batch(() => {
    options.setLoadedTracks(nextTracks)
    options.setLoadedEntryIds(nextEntryIds)
  })
  options.persistTrackQueue(nextTracks, nextEntryIds)
  options.order.resetOrder()
}

const reorderTrackInQueue = (
  options: CreatePlayerQueueControllerOptions,
  state: PlayerQueueControllerState,
  fromIndex: number,
  toIndex: number,
) => {
  const currentTracks = options.readTracks()
  if (
    options.isQueueControlled() ||
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= currentTracks.length ||
    toIndex >= currentTracks.length ||
    fromIndex === toIndex
  ) {
    return
  }

  const currentEntryIds = getPlaylistEntryIds(options, currentTracks)
  const nextTracks = moveAtIndex(currentTracks, fromIndex, toIndex)
  const nextEntryIds = moveAtIndex(currentEntryIds, fromIndex, toIndex)
  const currentIndex = options.readCurrentIndex()
  const activeEntryId = currentEntryIds[currentIndex]
  const nextCurrentIndex =
    activeEntryId === undefined ? currentIndex : nextEntryIds.indexOf(activeEntryId)

  state.queueRevision += 1
  batch(() => {
    options.setLoadedTracks(nextTracks)
    options.setLoadedEntryIds(nextEntryIds)
    options.setCurrentIndex(nextCurrentIndex < 0 ? currentIndex : nextCurrentIndex)
  })
  options.persistTrackQueue(nextTracks, nextEntryIds)
  options.order.resetOrder()

  if (nextCurrentIndex >= 0 && nextCurrentIndex !== currentIndex) {
    options.playbackPersistence.persistCurrentPlayback()
  }
}

const removeTrackFromQueue = (
  options: CreatePlayerQueueControllerOptions,
  state: PlayerQueueControllerState,
  initialPlaylistResolved: boolean,
  removeIndex: number,
) => {
  const currentTracks = options.readTracks()
  if (
    options.isQueueControlled() ||
    !Number.isInteger(removeIndex) ||
    removeIndex < 0 ||
    removeIndex >= currentTracks.length
  ) {
    return
  }

  const currentIndex = options.readCurrentIndex()
  const resolution = resolveTrackRemoval({
    currentIndex,
    removeIndex,
    trackCount: currentTracks.length,
  })
  const nextTracks = currentTracks.filter((_track, index) => index !== removeIndex)
  const currentEntryIds = getPlaylistEntryIds(options, currentTracks)
  const nextEntryIds = currentEntryIds.filter((_entryId, index) => index !== removeIndex)
  const removedTrack = currentTracks[removeIndex]
  const nextTrack = nextTracks[resolution.nextCurrentIndex]
  const shouldResume = options.isPlaying()

  if (!initialPlaylistResolved && removedTrack !== undefined) {
    const removedCount = state.removedBeforeLoad.get(removedTrack.id) ?? 0
    state.removedBeforeLoad.set(removedTrack.id, removedCount + 1)
  }

  if (resolution.currentTrackChanged) {
    options.cancelPendingRestart()
    options.playback.invalidate()
    options.onPlaybackRevisionChange()
  }
  state.queueRevision += 1

  if (resolution.currentTrackChanged && nextTrack !== undefined) {
    const nextEntryId = nextEntryIds[resolution.nextCurrentIndex]
    const nextPlayback = createPlaybackState(
      nextTrack,
      resolution.nextCurrentIndex,
      shouldResume,
      nextEntryId,
    )
    options.prepareTrackChange(shouldResume, nextTrack.id)
    options.playbackPersistence.setPendingPosition(nextPlayback)
    options.playbackPersistence.writePlayback(nextPlayback)
  }

  if (nextTrack === undefined) {
    options.clearPlaybackTransition()
    stopPlayback(options)
  }

  batch(() => {
    options.setLoadedTracks(nextTracks)
    options.setLoadedEntryIds(nextEntryIds)
    options.setCurrentIndex(resolution.nextCurrentIndex)
  })
  persistShiftedCurrentPlayback(options, currentIndex, resolution)
  options.persistTrackQueue(nextTracks, nextEntryIds)
  options.order.resetOrder()

  if (nextTrack !== undefined && resolution.currentTrackChanged) {
    queueMicrotask(options.restorePendingPlayback)
  }
}

const clearTrackQueue = (
  options: CreatePlayerQueueControllerOptions,
  state: PlayerQueueControllerState,
) => {
  if (options.isQueueControlled() || options.readTracks().length === 0) {
    return
  }

  if (!state.initialPlaylistResolved) {
    state.clearedBeforeLoad = true
  }

  options.cancelPendingRestart()
  options.clearPlaybackTransition()
  options.playback.invalidate()
  options.onPlaybackRevisionChange()
  state.queueRevision += 1
  options.previewPlayback.preventResume()
  stopPlayback(options)

  batch(() => {
    options.setLoadedTracks([])
    options.setLoadedEntryIds([])
    options.setCurrentIndex(0)
  })
  options.persistTrackQueue([], [])
  options.order.clearShuffleQueue()
}

const loadTrackQueue = (
  options: CreatePlayerQueueControllerOptions,
  state: PlayerQueueControllerState,
  loaded: PlaylistLoad,
  initializePlayback: PlayerQueueController['initializePlayback'],
): readonly PTrack[] => {
  state.initialPlaylistResolved = true
  const availableTracks = state.clearedBeforeLoad
    ? []
    : filterRemovedTrackOccurrences(loaded.defaultTracks, state.removedBeforeLoad)

  if (!loaded.queueChanged) {
    initializePlayback(availableTracks, null)
    return availableTracks
  }

  const currentTracks = options.readTracks()
  const currentIndex = options.readCurrentIndex()
  const mergedTracks = appendUniqueTracks(availableTracks, currentTracks)
  const availableEntryIds = createLegacyPlaylistEntryIds(availableTracks.map((track) => track.id))
  const currentEntryIds = getPlaylistEntryIds(options, currentTracks)
  const availableTrackIds = new Set(availableTracks.map((track) => track.id))
  const appendedCurrentEntryIds = currentTracks.flatMap((track, index) => {
    const entryId = currentEntryIds[index]
    if (entryId === undefined || availableTrackIds.has(track.id)) {
      return []
    }
    availableTrackIds.add(track.id)
    return [entryId]
  })
  const mergedEntryIds = [...availableEntryIds, ...appendedCurrentEntryIds]
  const activeEntryId = currentEntryIds[currentIndex]
  const identityMatchedIndex =
    activeEntryId === undefined ? -1 : mergedEntryIds.indexOf(activeEntryId)
  const activeIndex =
    identityMatchedIndex >= 0
      ? identityMatchedIndex
      : findActiveTrackIndex(currentTracks, mergedTracks, currentIndex)

  batch(() => {
    options.setLoadedTracks(mergedTracks)
    options.setLoadedEntryIds(mergedEntryIds)
    options.setCurrentIndex(activeIndex < 0 ? 0 : activeIndex)
  })
  options.persistTrackQueue(mergedTracks, mergedEntryIds)
  options.order.resetOrder()
  return mergedTracks
}

/** Coordinates playlist state changes without owning transport or navigation policy. */
export const createPlayerQueueController = (
  options: CreatePlayerQueueControllerOptions,
): PlayerQueueController => {
  const state: PlayerQueueControllerState = {
    clearedBeforeLoad: false,
    initialPlaylistResolved: options.isQueueControlled(),
    queueRevision: 0,
    removedBeforeLoad: new Map(),
  }
  const initializePlayback = (
    nextTracks: readonly PTrack[],
    storedPlayback: PPlaybackState | null,
    storedEntryIds?: readonly string[],
  ) => initializeQueuePlayback(options, nextTracks, storedPlayback, storedEntryIds)

  return {
    addTracksToQueue: (tracks) => addTracksToQueue(options, state, tracks),
    clearTrackQueue: () => clearTrackQueue(options, state),
    initializePlayback,
    onLoad: (loaded) => loadTrackQueue(options, state, loaded, initializePlayback),
    queueRevision: () => state.queueRevision,
    removeTrackFromQueue: (removeIndex) =>
      removeTrackFromQueue(options, state, state.initialPlaylistResolved, removeIndex),
    reorderTrackInQueue: (fromIndex, toIndex) =>
      reorderTrackInQueue(options, state, fromIndex, toIndex),
  }
}
