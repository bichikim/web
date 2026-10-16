import type {
  PuppetDeformerCurveHandle,
  PuppetDeformerShape,
  PuppetMesh,
  PuppetPoint,
} from '../../player'

/** A reflection across the line `axis = center`. */
export interface Mirror {
  readonly axis: 'x' | 'y'
  readonly center: number
}

const COORDINATES = 2
const TRIANGLE_CORNERS = 3

const reflect = (value: number, center: number) => 2 * center - value

export const mirrorPoint = <Point extends PuppetPoint>(point: Point, mirror: Mirror): Point => ({
  ...point,
  [mirror.axis]: reflect(point[mirror.axis], mirror.center),
})

/** XY pairs with the mirrored coordinate reflected. */
export const mirrorCoordinates = (coordinates: ReadonlyArray<number>, mirror: Mirror) =>
  coordinates.map((value, index) =>
    index % COORDINATES === (mirror.axis === 'x' ? 0 : 1) ? reflect(value, mirror.center) : value,
  )

/**
 * A reflected mesh. Each triangle's winding is reversed so its front still faces the viewer, as
 * culling and the mesh tools expect; vertex order and UVs stay, so the image appears mirrored.
 */
export const mirrorMesh = (mesh: PuppetMesh, mirror: Mirror): PuppetMesh => ({
  ...mesh,
  boundaryLoops: mesh.boundaryLoops?.map((loop) => loop.toReversed()),
  indices: mesh.indices.map((index, position) => {
    const corner = position % TRIANGLE_CORNERS
    const triangle = position - corner
    // Swapping the second and third corners reverses the winding.
    return corner === 0 ? index : mesh.indices[triangle + TRIANGLE_CORNERS - corner]!
  }),
  vertices: mirrorCoordinates(mesh.vertices, mirror),
})

/** Whether the shape is a warp grid, whose point order must follow the mirrored axis. */
const isGrid = (shape: Pick<PuppetDeformerShape, 'boneRestPoints' | 'curveAxis' | 'pins'>) =>
  shape.boneRestPoints === undefined && shape.pins === undefined && shape.curveAxis === undefined

/**
 * The grid point that lands at `pointIndex` once the grid is reflected: the same row's opposite
 * column for a horizontal mirror, the same column's opposite row for a vertical one.
 */
const mirroredGridIndex = (
  shape: Pick<PuppetDeformerShape, 'columns' | 'rows'>,
  pointIndex: number,
  axis: Mirror['axis'],
) => {
  const stride = shape.columns + 1
  const [row, column] = [Math.floor(pointIndex / stride), pointIndex % stride]
  return axis === 'x' ? row * stride + shape.columns - column : (shape.rows - row) * stride + column
}

interface DeformerForm {
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly rotationOrigin?: PuppetPoint
}

/**
 * Reflects a deformer's control points, curve handles and rotation origin. Grid points are
 * reordered so columns still run left to right and rows top to bottom; a handle along the
 * mirrored axis is then reflected about its point, since that axis now runs the other way.
 */
export const mirrorDeformerForm = <Form extends DeformerForm>(
  form: Form,
  layout: Pick<PuppetDeformerShape, 'boneRestPoints' | 'columns' | 'curveAxis' | 'pins' | 'rows'>,
  mirror: Mirror,
): Form => {
  const reflected = mirrorCoordinates(form.controlPoints, mirror)
  const grid = isGrid(layout)
  const order = (pointIndex: number) =>
    grid ? mirroredGridIndex(layout, pointIndex, mirror.axis) : pointIndex
  const controlPoints = Array.from({length: reflected.length / COORDINATES}, (_, index) => [
    reflected[order(index) * COORDINATES]!,
    reflected[order(index) * COORDINATES + 1]!,
  ]).flat()
  const along = mirror.axis === 'x' ? 'horizontal' : 'vertical'
  const curveHandles = form.curveHandles?.map((handle) => {
    const pointIndex = order(handle.pointIndex)
    const point = {
      x: controlPoints[pointIndex * COORDINATES]!,
      y: controlPoints[pointIndex * COORDINATES + 1]!,
    }
    const side = (direction: 'horizontal' | 'vertical') => {
      const position = mirrorPoint(handle[direction], mirror)
      return direction === along && grid
        ? {x: 2 * point.x - position.x, y: 2 * point.y - position.y}
        : position
    }
    return {horizontal: side('horizontal'), pointIndex, vertical: side('vertical')}
  })
  return {
    ...form,
    controlPoints,
    ...(curveHandles === undefined ? {} : {curveHandles}),
    ...(form.rotationOrigin === undefined
      ? {}
      : {rotationOrigin: mirrorPoint(form.rotationOrigin, mirror)}),
  }
}

/** A reflected deformer layout: bounds, rest bones, pins and its control form. */
export const mirrorDeformerShape = <Shape extends PuppetDeformerShape>(
  shape: Shape,
  mirror: Mirror,
): Shape => {
  const {bounds} = shape
  const size = mirror.axis === 'x' ? bounds.width : bounds.height
  return {
    ...mirrorDeformerForm(shape, shape, mirror),
    ...(shape.boneRestPoints === undefined
      ? {}
      : {boneRestPoints: mirrorCoordinates(shape.boneRestPoints, mirror)}),
    ...(shape.pins === undefined ? {} : {pins: shape.pins.map((pin) => mirrorPoint(pin, mirror))}),
    bounds: {...bounds, [mirror.axis]: reflect(bounds[mirror.axis], mirror.center) - size},
  }
}
