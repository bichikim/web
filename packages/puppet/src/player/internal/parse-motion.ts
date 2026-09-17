import type {PuppetMotion, PuppetParameter, PuppetPart} from '../document'

const COORDINATES_PER_VERTEX = 2

export const hasValidTrackTargets = (
  parts: ReadonlyArray<PuppetPart>,
  parameters: ReadonlyArray<PuppetParameter>,
  motions: ReadonlyArray<PuppetMotion>,
) => {
  const partById = new Map(parts.map((part) => [part.id, part]))
  const parameterById = new Map(parameters.map((parameter) => [parameter.id, parameter]))

  return motions.every((motion) => {
    const parameterTrackIds = motion.tracks.flatMap((track) =>
      track.kind === 'parameter' ? [track.parameterId] : [],
    )

    return (
      new Set(parameterTrackIds).size === parameterTrackIds.length &&
      motion.tracks.every((track) => {
        if (track.kind === 'parameter') {
          const parameter = parameterById.get(track.parameterId)
          return (
            parameter !== undefined &&
            track.keyframes.every(
              (keyframe) =>
                keyframe.value >= parameter.minimum && keyframe.value <= parameter.maximum,
            )
          )
        }

        const part = partById.get(track.partId)
        const vertexCount =
          part === undefined ? 0 : part.mesh.vertices.length / COORDINATES_PER_VERTEX

        return (
          part !== undefined &&
          Number.isInteger(track.vertexIndex) &&
          track.vertexIndex >= 0 &&
          track.vertexIndex < vertexCount
        )
      })
    )
  })
}
