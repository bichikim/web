import {type PuppetPoint, type PuppetSceneDeformerNode, transformDeformerPoint} from '../../player'

interface GridPath {
  readonly data: string
}

const GRID_CURVE_SEGMENTS_PER_CELL = 8

const createPathData = (points: ReadonlyArray<PuppetPoint>) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

export const createGridPaths = (
  node: PuppetSceneDeformerNode,
  transform: (point: PuppetPoint) => PuppetPoint,
) => {
  const paths: GridPath[] = []
  const horizontalSegments = node.columns * GRID_CURVE_SEGMENTS_PER_CELL
  const verticalSegments = node.rows * GRID_CURVE_SEGMENTS_PER_CELL

  for (let row = 0; row <= node.rows; row += 1) {
    const y = node.bounds.y + (node.bounds.height * row) / node.rows
    const points = Array.from({length: horizontalSegments + 1}, (_, index) =>
      transform(
        transformDeformerPoint(node, {
          x: node.bounds.x + (node.bounds.width * index) / horizontalSegments,
          y,
        }),
      ),
    )
    paths.push({data: createPathData(points)})
  }

  for (let column = 0; column <= node.columns; column += 1) {
    const x = node.bounds.x + (node.bounds.width * column) / node.columns
    const points = Array.from({length: verticalSegments + 1}, (_, index) =>
      transform(
        transformDeformerPoint(node, {
          x,
          y: node.bounds.y + (node.bounds.height * index) / verticalSegments,
        }),
      ),
    )
    paths.push({data: createPathData(points)})
  }

  return paths
}

export const createTranslationPath = (
  node: PuppetSceneDeformerNode,
  transform: (point: PuppetPoint) => PuppetPoint,
) => {
  const horizontalSegments = node.columns * GRID_CURVE_SEGMENTS_PER_CELL
  const verticalSegments = node.rows * GRID_CURVE_SEGMENTS_PER_CELL
  const points = [
    ...Array.from({length: horizontalSegments + 1}, (_, index) => ({
      x: node.bounds.x + (node.bounds.width * index) / horizontalSegments,
      y: node.bounds.y,
    })),
    ...Array.from({length: verticalSegments}, (_, index) => ({
      x: node.bounds.x + node.bounds.width,
      y: node.bounds.y + (node.bounds.height * (index + 1)) / verticalSegments,
    })),
    ...Array.from({length: horizontalSegments}, (_, index) => ({
      x:
        node.bounds.x + (node.bounds.width * (horizontalSegments - index - 1)) / horizontalSegments,
      y: node.bounds.y + node.bounds.height,
    })),
    ...Array.from({length: verticalSegments - 1}, (_, index) => ({
      x: node.bounds.x,
      y: node.bounds.y + (node.bounds.height * (verticalSegments - index - 1)) / verticalSegments,
    })),
  ].map((point) => transform(transformDeformerPoint(node, point)))

  return `${createPathData(points)} Z`
}
