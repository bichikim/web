import type {PuppetDocument, PuppetPoint} from '../document'
import type {ParameterDrag, ParameterDragOptions} from '../parameter-drag'
import type {PlayerRenderer} from '../rendering/create-player-renderer'
import {createPartPoseSampler} from './create-part-pose-sampler'
import {solveParameterPose} from './solve-parameter-pose'

interface CreateParameterDragOptions extends ParameterDragOptions {
  readonly document: () => PuppetDocument | undefined
  readonly renderer: PlayerRenderer
  readonly values: () => Readonly<Record<string, number>>
}

export const createParameterDrag = (
  options: CreateParameterDragOptions,
): ParameterDrag | undefined => {
  const {renderer, values, parameterIds} = options
  const document = options.document()
  if (document === undefined) {
    return undefined
  }
  const point = renderer.toDocumentPoint(options.point)
  const partId = renderer.pickPart(point)
  const vertices = partId === undefined ? undefined : renderer.getPartVertices(partId)
  const parameters = parameterIds.flatMap(
    (id) =>
      document.parameters?.filter(
        (parameter) => parameter.id === id && parameter.maximum > parameter.minimum,
      ) ?? [],
  )
  if (
    partId === undefined ||
    vertices === undefined ||
    parameterIds.length === 0 ||
    parameters.length !== parameterIds.length ||
    new Set(parameterIds).size !== parameterIds.length
  ) {
    return undefined
  }
  const sample = createPartPoseSampler({document, partId, point, vertices})
  if (sample === undefined) {
    return undefined
  }
  const pose = sample(values())
  const pixel = renderer.toDocumentPoint({x: options.point.x + 1, y: options.point.y + 1})
  const PIXEL_TOLERANCE = 0.25
  const tolerance = Math.hypot(pixel.x - point.x, pixel.y - point.y) * PIXEL_TOLERANCE
  const ANGLE_DISTANCE_RATIO = 0.03
  const target = (position: PuppetPoint) => {
    const converted = renderer.toDocumentPoint(position)
    return {angle: pose.angle, x: pose.x + converted.x - point.x, y: pose.y + converted.y - point.y}
  }
  return {
    solve(position) {
      if (options.document() !== document) {
        return {}
      }
      const solved = solveParameterPose({
        angleScale: options.preserveAngle
          ? Math.max(document.viewport.width, document.viewport.height) * ANGLE_DISTANCE_RATIO
          : 0,
        mobility: options.mobility,
        parameters,
        sample,
        target: target(position),
        tolerance,
        values: values(),
      })
      return Object.fromEntries(parameterIds.map((id) => [id, solved[id]!]))
    },
  }
}
