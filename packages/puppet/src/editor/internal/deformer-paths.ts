import {transformDeformerShape} from '../../deformation'
import type {PuppetPoint, PuppetSceneDeformerNode} from '../../player'

interface GridPath {
  readonly data: string
  readonly tangent?: boolean
}

const CURVE_SEGMENTS = 48
const CENTER_PROGRESS = 0.5
const CUBIC_DEGREE = 3
const GRID_CURVE_SEGMENTS_PER_CELL = 8

const createPathData = (points: ReadonlyArray<PuppetPoint>) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

const getCurveProgresses = (node: PuppetSceneDeformerNode) =>
  (node.curveBreaks ?? [0, 1]).flatMap((boundary, index, breaks) =>
    index === breaks.length - 1
      ? [1]
      : Array.from(
          {length: CURVE_SEGMENTS},
          (_, sample) => boundary + ((breaks[index + 1]! - boundary) * sample) / CURVE_SEGMENTS,
        ),
  )

const getCurveSamples = (
  node: PuppetSceneDeformerNode,
  transform: (point: PuppetPoint) => PuppetPoint,
) =>
  getCurveProgresses(node).map((progress) => ({
    ...transform(
      transformDeformerShape(node, {
        x:
          node.bounds.x + node.bounds.width * (node.curveAxis === 'x' ? progress : CENTER_PROGRESS),
        y:
          node.bounds.y +
          node.bounds.height * (node.curveAxis === 'y' ? progress : CENTER_PROGRESS),
      }),
    ),
    progress,
  }))

export interface FindCurveSplitOptions {
  readonly node: PuppetSceneDeformerNode
  readonly point: PuppetPoint
  readonly transform: (point: PuppetPoint) => PuppetPoint
}

export const findCurveSplit = (options: FindCurveSplitOptions) => {
  const samples = getCurveSamples(options.node, options.transform)
  let distance = Number.POSITIVE_INFINITY
  let progress = 0
  samples.slice(1).forEach((end, index) => {
    const start = samples[index]!
    const horizontal = end.x - start.x
    const vertical = end.y - start.y
    const length = horizontal ** 2 + vertical ** 2
    const ratio =
      length === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((options.point.x - start.x) * horizontal + (options.point.y - start.y) * vertical) /
                length,
            ),
          )
    const candidate =
      (options.point.x - start.x - horizontal * ratio) ** 2 +
      (options.point.y - start.y - vertical * ratio) ** 2
    if (candidate < distance) {
      distance = candidate
      progress = start.progress + (end.progress - start.progress) * ratio
    }
  })
  const breaks = options.node.curveBreaks ?? [0, 1]
  const index = breaks.findIndex((boundary) => boundary > progress) - 1
  if (index < 0) {
    return undefined
  }
  const ratio = (progress - breaks[index]!) / (breaks[index + 1]! - breaks[index]!)
  const MINIMUM_RATIO = 0.001
  return ratio > MINIMUM_RATIO && ratio < 1 - MINIMUM_RATIO ? {index, ratio} : undefined
}

export const createGridPaths = (
  node: PuppetSceneDeformerNode,
  transform: (point: PuppetPoint) => PuppetPoint,
) => {
  if (node.curveAxis !== undefined) {
    const points = getCurveSamples(node, transform)
    const handles = Array.from({length: node.controlPoints.length / 2}, (_, index) => index).map(
      (index) =>
        transform({x: node.controlPoints[index * 2]!, y: node.controlPoints[index * 2 + 1]!}),
    )
    return [
      {data: createPathData(points)},
      ...handles.flatMap((point, index) =>
        index % CUBIC_DEGREE === 0
          ? []
          : [
              {
                data: createPathData([
                  point,
                  handles[index % CUBIC_DEGREE === 1 ? index - 1 : index + 1]!,
                ]),
                tangent: true,
              },
            ],
      ),
    ]
  }
  const paths: GridPath[] = []
  const horizontalSegments = node.columns * GRID_CURVE_SEGMENTS_PER_CELL
  const verticalSegments = node.rows * GRID_CURVE_SEGMENTS_PER_CELL

  for (let row = 0; row <= node.rows; row += 1) {
    const y = node.bounds.y + (node.bounds.height * row) / node.rows
    const points = Array.from({length: horizontalSegments + 1}, (_, index) =>
      transform(
        transformDeformerShape(node, {
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
        transformDeformerShape(node, {
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
  if (node.curveAxis !== undefined) {
    const progresses = getCurveProgresses(node)
    const boundaryPoint = (progress: number, opposite: boolean) =>
      transform(
        transformDeformerShape(node, {
          x:
            node.bounds.x +
            node.bounds.width * (node.curveAxis === 'x' ? progress : Number(opposite)),
          y:
            node.bounds.y +
            node.bounds.height * (node.curveAxis === 'y' ? progress : Number(opposite)),
        }),
      )
    const boundary = [
      ...progresses.map((progress) => boundaryPoint(progress, false)),
      ...progresses.toReversed().map((progress) => boundaryPoint(progress, true)),
    ]
    return `${createPathData(boundary)} Z`
  }
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
  ].map((point) => transform(transformDeformerShape(node, point)))

  return `${createPathData(points)} Z`
}
