import type {PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import {deformBrushVertices} from '../deform-brush-vertices'
import {smoothGridPoints} from './smooth-grid-points'

export type GridBrushMode = 'move' | 'expand' | 'smooth'
interface ApplyGridBrushOptions {
  readonly mode: GridBrushMode
  readonly node: PuppetSceneDeformerNode
  readonly center: PuppetPoint
  readonly delta: PuppetPoint
  readonly hardness: number
  readonly radius: number
  readonly strength: number
  readonly transform: (point: PuppetPoint) => PuppetPoint
  readonly untransform: (point: PuppetPoint) => PuppetPoint
}

const transformCoordinates = (
  coordinates: readonly number[],
  transform: (point: PuppetPoint) => PuppetPoint,
) =>
  Array.from({length: coordinates.length / 2}, (_, index) => {
    const point = transform({x: coordinates[index * 2]!, y: coordinates[index * 2 + 1]!})
    return [point.x, point.y]
  }).flat()

const getBrushPoints = (options: ApplyGridBrushOptions) => {
  switch (options.mode) {
    case 'smooth':
      return smoothGridPoints({
        center: options.center,
        columns: options.node.columns,
        controlPoints: options.node.controlPoints,
        radius: options.radius,
        rows: options.node.rows,
        strength: options.strength,
        transform: options.transform,
      })
    case 'move':
    case 'expand':
      return transformCoordinates(
        deformBrushVertices({
          center: options.center,
          delta: options.delta,
          hardness: options.hardness,
          mode: options.mode,
          radius: options.radius,
          strength: options.strength,
          vertices: transformCoordinates(options.node.controlPoints, options.transform),
        }),
        options.untransform,
      )
    default: {
      const unreachable: never = options.mode
      return unreachable
    }
  }
}

/** Applies a brush in displayed coordinates and carries each grid point's curvature handles with it. */
export const applyGridBrush = (options: ApplyGridBrushOptions): PuppetSceneDeformerNode => {
  const controlPoints = getBrushPoints(options)
  const curveHandles = options.node.curveHandles?.map((handle) => {
    const index = handle.pointIndex * 2
    const offset = {
      x: controlPoints[index]! - options.node.controlPoints[index]!,
      y: controlPoints[index + 1]! - options.node.controlPoints[index + 1]!,
    }
    const translate = (point: PuppetPoint) => ({x: point.x + offset.x, y: point.y + offset.y})
    return {
      ...handle,
      horizontal: translate(handle.horizontal),
      vertical: translate(handle.vertical),
    }
  })
  return {...options.node, controlPoints, curveHandles}
}
