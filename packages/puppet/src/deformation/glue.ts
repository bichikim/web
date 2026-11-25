import type {PuppetGlue} from '../player/document'

type Coordinates = Float32Array | number[]
type Point = readonly [number, number]

const getAnchor = (vertices: Coordinates, reference: PuppetGlue['second']): Point => {
  const offset = reference.vertexIndex * 2
  const coordinate = (axis: number) =>
    'edge' in reference
      ? vertices[offset + axis]! * (1 - reference.edge.position) +
        vertices[reference.edge.endIndex * 2 + axis]! * reference.edge.position
      : vertices[offset + axis]!
  return [coordinate(0), coordinate(1)]
}

const rotateCoordinates = (vertices: Coordinates, pivot: Point, angle: number) => {
  if (angle === 0) {
    return
  }
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  for (let index = 0; index < vertices.length; index += 2) {
    const x = vertices[index]! - pivot[0]
    const y = vertices[index + 1]! - pivot[1]
    vertices[index] = pivot[0] + x * cosine - y * sine
    vertices[index + 1] = pivot[1] + x * sine + y * cosine
  }
}

const alignRotation = (connection: PuppetGlue, first: Coordinates, second: Coordinates) => {
  const MINIMUM_DIRECTION = 0.000001
  const {rotation} = connection
  if (connection.mode !== 'rigid' || rotation === undefined) {
    return
  }
  const firstAnchor = getAnchor(first, connection.first)
  const secondAnchor = getAnchor(second, connection.second)
  const firstX = first[rotation.first * 2]! - firstAnchor[0]
  const firstY = first[rotation.first * 2 + 1]! - firstAnchor[1]
  const secondX = second[rotation.second * 2]! - secondAnchor[0]
  const secondY = second[rotation.second * 2 + 1]! - secondAnchor[1]
  if (
    Math.hypot(firstX, firstY) > MINIMUM_DIRECTION &&
    Math.hypot(secondX, secondY) > MINIMUM_DIRECTION
  ) {
    const angle = Math.atan2(
      firstX * secondY - firstY * secondX,
      firstX * secondX + firstY * secondY,
    )
    rotateCoordinates(first, firstAnchor, angle * connection.weight * connection.strength)
    if (!('edge' in connection.second)) {
      rotateCoordinates(
        second,
        secondAnchor,
        -angle * (1 - connection.weight) * connection.strength,
      )
    }
  }
}

/** Moves one vertex coordinate, or all vertices when vertexIndex is omitted. */
const moveCoordinates = (
  vertices: Float32Array | number[],
  axis: number,
  displacement: number,
  vertexIndex?: number,
) => {
  const start = vertexIndex === undefined ? axis : vertexIndex * 2 + axis
  const end = vertexIndex === undefined ? vertices.length : start + 1
  for (let index = start; index < end; index += 2) {
    vertices[index]! += displacement
  }
}

/** Joins deformed anchors, optionally moving complete parts while preserving their shape. */
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
      alignRotation(connection, first, second)
      for (const axis of [0, 1]) {
        const firstValue = first[firstOffset + axis]!
        const endpoint = connection.second
        const secondValue =
          'edge' in endpoint
            ? second[secondOffset + axis]! * (1 - endpoint.edge.position) +
              second[endpoint.edge.endIndex * 2 + axis]! * endpoint.edge.position
            : second[secondOffset + axis]!
        const target = firstValue * (1 - connection.weight) + secondValue * connection.weight
        moveCoordinates(
          first,
          axis,
          (target - firstValue) * connection.strength,
          connection.mode === undefined || connection.mode === 'vertex'
            ? connection.first.vertexIndex
            : undefined,
        )
        if (!('edge' in connection.second)) {
          moveCoordinates(
            second,
            axis,
            (target - secondValue) * connection.strength,
            connection.mode === undefined || connection.mode === 'vertex'
              ? connection.second.vertexIndex
              : undefined,
          )
        }
      }
    }
  }
}
