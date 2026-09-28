import {requestTrackAccess} from '../track-preview-access'
import type {PTrackSource} from './model'

const loadEntitledTrackSource = async (trackId: string): Promise<string> => {
  const access = await requestTrackAccess(trackId)

  if (access === null || access.mode !== 'full') {
    throw new Error('Full track access is required for playback')
  }

  return access.url
}

/** Resolves a track source at playback time without persisting an expiring URL. */
export const resolvePTrackSource = (source: PTrackSource): Promise<string> | string => {
  if (typeof source === 'string') {
    return source
  }

  return source.kind === 'public' ? source.url : loadEntitledTrackSource(source.trackId)
}
