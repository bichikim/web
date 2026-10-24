import type {PuppetDeformerShape, PuppetPoint} from '../player/document'

const EXTENSION = 2
const CENTER = 0.5
const CORNER_COUNT = 4

const interval = (value: number, divisions: number) => {
  if (value < 0) {
    return {from: -EXTENSION, progress: (value + EXTENSION) / EXTENSION, to: 0}
  }
  if (value > 1) {
    return {from: 1, progress: (value - 1) / EXTENSION, to: 1 + EXTENSION}
  }
  const index = Math.min(divisions - 1, Math.floor(value * divisions))
  return {from: index / divisions, progress: value * divisions - index, to: (index + 1) / divisions}
}

/** SDK의 가상 외곽 격자를 포함해 삼각형 또는 사각형 셀을 보간한다. */
export const sampleWarpGrid = (node: PuppetDeformerShape, point: PuppetPoint): PuppetPoint => {
  const horizontal = interval((point.x - node.bounds.x) / node.bounds.width, node.columns)
  const vertical = interval((point.y - node.bounds.y) / node.bounds.height, node.rows)
  const coordinate = (x: number, y: number, axis: number) => {
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      const offset =
        (Math.round(y * node.rows) * (node.columns + 1) + Math.round(x * node.columns)) * 2
      return node.controlPoints[offset + axis]!
    }
    const topLeft = node.controlPoints[axis]!
    const topRight = node.controlPoints[node.columns * 2 + axis]!
    const bottomLeft = node.controlPoints[node.rows * (node.columns + 1) * 2 + axis]!
    const bottomRight = node.controlPoints[((node.rows + 1) * (node.columns + 1) - 1) * 2 + axis]!
    const center = (topLeft + topRight + bottomLeft + bottomRight) / CORNER_COUNT
    return (
      center +
      ((x - CENTER) * (topRight + bottomRight - topLeft - bottomLeft)) / 2 +
      ((y - CENTER) * (bottomLeft + bottomRight - topLeft - topRight)) / 2
    )
  }
  const sample = (axis: number) => {
    const topLeft = coordinate(horizontal.from, vertical.from, axis)
    const topRight = coordinate(horizontal.to, vertical.from, axis)
    const bottomLeft = coordinate(horizontal.from, vertical.to, axis)
    const bottomRight = coordinate(horizontal.to, vertical.to, axis)
    const x = horizontal.progress
    const y = vertical.progress
    if (node.interpolation === 'bilinear') {
      return (
        topLeft * (1 - x) * (1 - y) +
        topRight * x * (1 - y) +
        bottomLeft * (1 - x) * y +
        bottomRight * x * y
      )
    }
    if (node.interpolation === 'triangles-mirrored') {
      return x >= y
        ? topLeft + (topRight - topLeft) * x + (bottomRight - topRight) * y
        : topLeft + (bottomRight - bottomLeft) * x + (bottomLeft - topLeft) * y
    }
    return x + y <= 1
      ? topLeft + (topRight - topLeft) * x + (bottomLeft - topLeft) * y
      : bottomRight + (bottomLeft - bottomRight) * (1 - x) + (topRight - bottomRight) * (1 - y)
  }
  return {x: sample(0), y: sample(1)}
}
