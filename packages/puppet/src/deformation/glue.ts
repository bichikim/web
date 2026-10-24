import type {PuppetGlue} from '../player/document'

/** Joins vertices or follows fixed edge coordinates after scene deformation. */
export const applyGlue = (
  connections: ReadonlyArray<PuppetGlue>,
  vertices: ReadonlyMap<string, Float32Array | number[]>,
): void => {
  for (const connection of connections) {
    const first = vertices.get(connection.first.partId)
    const second = vertices.get(connection.second.partId)
    const firstOffset = connection.first.vertexIndex * 2
    const secondOffset = connection.second.vertexIndex * 2
    if (
      first !== undefined &&
      second !== undefined &&
      firstOffset + 1 < first.length &&
      secondOffset + 1 < second.length
    ) {
      for (const axis of [0, 1]) {
        const firstValue = first[firstOffset + axis]!
        const endpoint = connection.second
        const secondValue =
          'edge' in endpoint
            ? second[secondOffset + axis]! * (1 - endpoint.edge.position) +
              second[endpoint.edge.endIndex * 2 + axis]! * endpoint.edge.position
            : second[secondOffset + axis]!
        const target = firstValue * (1 - connection.weight) + secondValue * connection.weight
        first[firstOffset + axis] = firstValue + (target - firstValue) * connection.strength
        if (!('edge' in connection.second)) {
          second[secondOffset + axis] = secondValue + (target - secondValue) * connection.strength
        }
      }
    }
  }
}
