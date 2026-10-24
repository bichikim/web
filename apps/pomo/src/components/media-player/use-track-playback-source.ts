import {type Accessor, createEffect, on, onCleanup, untrack} from 'solid-js'
import {
  acquireTrackPlaybackSource,
  type TrackPlaybackSource,
} from '../../features/focus-room-audio/track-playback-source'
import type {PTrack} from '../../features/focus-room-audio/focus-room-playlist/model'

interface SourceOwnerOptions {
  readonly element: Accessor<HTMLAudioElement | undefined>
  readonly onBeforeDispose?: () => void
  readonly onError: (error: unknown) => void
  readonly track: Accessor<PTrack | undefined>
}
interface OwnedSource {
  readonly element: HTMLAudioElement
  readonly id: string
  readonly lease: TrackPlaybackSource
  readonly source: string
}
export const useTrackPlaybackSource = (options: SourceOwnerOptions) => {
  let owned: OwnedSource | null = null
  let disposed = false
  const clearOwned = () => {
    const previous = owned
    owned = null
    if (previous !== null) {
      previous.element.removeAttribute('src')
      previous.element.load()
      previous.lease.release?.()
    }
  }
  const ensureSource = (): boolean => {
    if (disposed) {
      return false
    }
    const element = options.element()
    const track = options.track()
    if (element === undefined || track === undefined) {
      clearOwned()
      return false
    }
    if (owned?.element === element && owned.id === track.id && owned.source === track.source) {
      return true
    }
    let lease: TrackPlaybackSource
    try {
      lease = acquireTrackPlaybackSource(track)
    } catch (error: unknown) {
      element.pause()
      owned?.element.pause()
      clearOwned()
      untrack(() => options.onError(error))
      return false
    }
    const previous = owned
    if (previous !== null && previous.element !== element) {
      previous.element.removeAttribute('src')
      previous.element.load()
    }
    element.src = lease.source
    owned = {element, id: track.id, lease, source: track.source}
    previous?.lease.release?.()
    return true
  }
  createEffect(on([options.element, options.track], () => ensureSource()))
  onCleanup(() => {
    disposed = true
    try {
      options.onBeforeDispose?.()
    } finally {
      clearOwned()
    }
  })
  return {ensureSource}
}
