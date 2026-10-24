import {replaceBlobObjectUrl} from '../blob-object-url'
import type {PTrack} from './focus-room-playlist/model'

export interface TrackPlaybackSource {
  readonly release?: () => void
  readonly source: string
}
export const acquireTrackPlaybackSource = (
  track: Pick<PTrack, 'source' | 'sourceBlob'>,
): TrackPlaybackSource => {
  if (track.sourceBlob === undefined) {
    return {source: track.source}
  }
  const source = replaceBlobObjectUrl(null, () => track.sourceBlob!)
  let released = false
  return {
    release: () => {
      if (!released) {
        released = true
        replaceBlobObjectUrl(source, () => null)
      }
    },
    source,
  }
}
