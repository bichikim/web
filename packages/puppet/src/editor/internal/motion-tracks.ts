import type {MeshPoint} from '../../mesh'
import type {PuppetDocument} from '../../player/document'

export const removeMotionTracks = (document: PuppetDocument, partId: string, vertexIndex: number) =>
  document.motions.map((motion) => ({
    ...motion,
    tracks: motion.tracks.filter(
      (track) => track.partId !== partId || track.vertexIndex !== vertexIndex,
    ),
  }))

export const updateMotionIndices = (
  document: PuppetDocument,
  partId: string,
  vertexIndex: number,
) =>
  removeMotionTracks(document, partId, vertexIndex).map((motion) => ({
    ...motion,
    tracks: motion.tracks.map((track) =>
      track.partId === partId && track.vertexIndex > vertexIndex
        ? {...track, vertexIndex: track.vertexIndex - 1}
        : track,
    ),
  }))

interface CollapseMotionIndicesOptions {
  readonly deletedVertexIndex: number
  readonly document: PuppetDocument
  readonly partId: string
  readonly promotedOffset: MeshPoint
  readonly promotedVertexIndex: number
}

export const collapseMotionIndices = (options: CollapseMotionIndicesOptions) => {
  const {deletedVertexIndex, document, partId, promotedOffset, promotedVertexIndex} = options
  const nextPromotedIndex =
    promotedVertexIndex > deletedVertexIndex ? promotedVertexIndex - 1 : promotedVertexIndex

  return document.motions.map((motion) => ({
    ...motion,
    tracks: motion.tracks
      .filter(
        (track) =>
          track.partId !== partId ||
          track.vertexIndex !== promotedVertexIndex ||
          !motion.tracks.some(
            (candidate) =>
              candidate.partId === partId &&
              candidate.vertexIndex === deletedVertexIndex &&
              candidate.axis === track.axis,
          ),
      )
      .map((track) => {
        if (track.partId !== partId) {
          return track
        }

        if (track.vertexIndex === deletedVertexIndex) {
          return {...track, vertexIndex: nextPromotedIndex}
        }

        if (track.vertexIndex === promotedVertexIndex) {
          const offset = track.axis === 'x' ? promotedOffset.x : promotedOffset.y
          return {
            ...track,
            keyframes: track.keyframes.map((keyframe) => ({
              ...keyframe,
              value: keyframe.value + offset,
            })),
            vertexIndex: nextPromotedIndex,
          }
        }

        return track.vertexIndex > deletedVertexIndex
          ? {...track, vertexIndex: track.vertexIndex - 1}
          : track
      }),
  }))
}
