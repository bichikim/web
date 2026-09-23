import {getBoneChannels, poseBoneChannels} from '../../deformation/bone'
import {getDeformerPoint, getDeformerRotationOrigin} from './deformer-transform'
import {moveCurveHandles} from './curve-control-points'
import {
  isTwoDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValues,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterDeformerKeyform,
  PuppetParameterKeyform,
  PuppetPoint,
  PuppetSceneDeformerNode,
} from '../../player'
import {
  getDocumentParameterBindings,
  getParameterBinding,
  getParameterTargetDeformerIds,
} from './parameter-keyforms'
import {getSceneNode, isSceneNodeLocked} from './scene-graph'

interface ParameterDeformerValuesTarget {
  readonly bindingId: string
  readonly document: PuppetDocument
  readonly nodeId: string
  /** Displayed geometry with the active binding at full influence. */
  readonly previewDeformer?: PuppetSceneDeformerNode
  readonly values: PuppetParameterValues
}

const toKeyformCoordinate = (value: number, preview: number | undefined, stored: number) =>
  preview === undefined ? value : stored + value - preview

const toKeyformPoint = (
  point: PuppetPoint,
  preview: PuppetPoint | undefined,
  stored: PuppetPoint,
): PuppetPoint => ({
  x: toKeyformCoordinate(point.x, preview?.x, stored.x),
  y: toKeyformCoordinate(point.y, preview?.y, stored.y),
})

const isFinitePoint = (point: PuppetPoint) => Number.isFinite(point.x) && Number.isFinite(point.y)

const replaceBinding = (
  document: PuppetDocument,
  bindingId: string,
  update: (binding: PuppetParameterBinding) => PuppetParameterBinding,
) => ({
  ...document,
  parameterBindings: getDocumentParameterBindings(document).map((binding) =>
    binding.id === bindingId ? update(binding) : binding,
  ),
})

const replaceKeyformDeformer = (
  document: PuppetDocument,
  bindingId: string,
  values: PuppetParameterValues,
  deformer: PuppetParameterDeformerKeyform,
) =>
  replaceBinding(document, bindingId, (binding) => {
    const replaceDeformer = <Keyform extends PuppetParameterKeyform>(keyform: Keyform): Keyform =>
      parameterValuesEqual(keyform.values, values)
        ? {
            ...keyform,
            deformers: (keyform.deformers ?? []).map((candidate) =>
              candidate.nodeId === deformer.nodeId ? deformer : candidate,
            ),
          }
        : keyform

    return isTwoDimensionalParameterBinding(binding)
      ? {...binding, keyforms: binding.keyforms.map(replaceDeformer)}
      : {...binding, keyforms: binding.keyforms.map(replaceDeformer)}
  })

export interface SetParameterKeyformDeformerControlPointsOptions extends ParameterDeformerValuesTarget {
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: PuppetParameterDeformerKeyform['curveHandles']
  readonly rotationOrigin?: PuppetPoint
}

const toKeyformControlPoints = (
  options: SetParameterKeyformDeformerControlPointsOptions,
  deformer: PuppetParameterDeformerKeyform,
): ReadonlyArray<number> => {
  const preview = options.previewDeformer
  if (preview === undefined) {
    return options.controlPoints
  }
  const rest = preview.boneRestPoints
  if (rest === undefined) {
    return options.controlPoints.map((value, index) =>
      toKeyformCoordinate(value, preview.controlPoints[index], deformer.controlPoints[index]!),
    )
  }
  const desired = getBoneChannels(rest, options.controlPoints)
  const displayed = getBoneChannels(rest, preview.controlPoints)
  const stored = getBoneChannels(rest, deformer.controlPoints)
  return poseBoneChannels(
    rest,
    desired.map((value, index) => toKeyformCoordinate(value, displayed[index], stored[index]!)),
  )
}

const toKeyformGeometry = (
  options: SetParameterKeyformDeformerControlPointsOptions,
  deformer: PuppetParameterDeformerKeyform,
): PuppetParameterDeformerKeyform => {
  const preview = options.previewDeformer
  const node = getSceneNode(options.document, options.nodeId)
  const origin =
    deformer.rotationOrigin ??
    (node?.kind === 'deformer' ? getDeformerRotationOrigin(node) : {x: 0, y: 0})
  return {
    ...deformer,
    controlPoints: toKeyformControlPoints(options, deformer),
    ...(options.curveHandles === undefined
      ? {}
      : {
          curveHandles: options.curveHandles.map((handle) => {
            const stored = deformer.curveHandles!.find(
              (candidate) => candidate.pointIndex === handle.pointIndex,
            )!
            const displayed = preview?.curveHandles?.find(
              (candidate) => candidate.pointIndex === handle.pointIndex,
            )
            return {
              ...handle,
              horizontal: toKeyformPoint(
                handle.horizontal,
                displayed?.horizontal,
                stored.horizontal,
              ),
              vertical: toKeyformPoint(handle.vertical, displayed?.vertical, stored.vertical),
            }
          }),
        }),
    ...(options.rotationOrigin === undefined
      ? {}
      : {
          rotationOrigin: toKeyformPoint(
            options.rotationOrigin,
            preview === undefined ? undefined : getDeformerRotationOrigin(preview),
            origin,
          ),
        }),
  }
}

export const setParameterKeyformDeformerControlPoints = (
  options: SetParameterKeyformDeformerControlPointsOptions,
) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const keyform = binding?.keyforms.find((candidate) =>
    parameterValuesEqual(candidate.values, options.values),
  )
  const deformer = keyform?.deformers?.find((candidate) => candidate.nodeId === options.nodeId)
  if (
    binding === undefined ||
    deformer?.kind !== 'deformer' ||
    isSceneNodeLocked(options.document, options.nodeId) ||
    !getParameterTargetDeformerIds(binding).includes(options.nodeId) ||
    options.controlPoints.length !== deformer.controlPoints.length ||
    options.controlPoints.some((coordinate) => !Number.isFinite(coordinate)) ||
    (options.rotationOrigin !== undefined && !isFinitePoint(options.rotationOrigin)) ||
    (options.curveHandles !== undefined &&
      (options.curveHandles.length !== (deformer.curveHandles?.length ?? 0) ||
        options.curveHandles.some(
          (handle) =>
            deformer.curveHandles?.some(
              (candidate) => candidate.pointIndex === handle.pointIndex,
            ) !== true ||
            !Number.isFinite(handle.horizontal.x) ||
            !Number.isFinite(handle.horizontal.y) ||
            !Number.isFinite(handle.vertical.x) ||
            !Number.isFinite(handle.vertical.y),
        )))
  ) {
    return undefined
  }

  return replaceKeyformDeformer(
    options.document,
    binding.id,
    options.values,
    toKeyformGeometry(options, deformer),
  )
}

export interface SetParameterKeyformDeformerPointOptions extends ParameterDeformerValuesTarget {
  readonly pointIndex: number
  readonly x: number
  readonly y: number
}

export const setParameterKeyformDeformerPoint = (
  options: SetParameterKeyformDeformerPointOptions,
) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const keyform = binding?.keyforms.find((candidate) =>
    parameterValuesEqual(candidate.values, options.values),
  )
  const deformer = keyform?.deformers?.find((candidate) => candidate.nodeId === options.nodeId)
  if (
    binding === undefined ||
    deformer?.kind !== 'deformer' ||
    isSceneNodeLocked(options.document, options.nodeId) ||
    !getParameterTargetDeformerIds(binding).includes(options.nodeId) ||
    !Number.isInteger(options.pointIndex) ||
    options.pointIndex < 0 ||
    options.pointIndex >= deformer.controlPoints.length / 2 ||
    !isFinitePoint(options)
  ) {
    return undefined
  }

  let controlPoints = [...deformer.controlPoints]
  const previousX = controlPoints[options.pointIndex * 2] ?? 0
  const previousY = controlPoints[options.pointIndex * 2 + 1] ?? 0
  const {x, y} = toKeyformPoint(
    options,
    options.previewDeformer === undefined
      ? undefined
      : getDeformerPoint(options.previewDeformer, options.pointIndex),
    {x: previousX, y: previousY},
  )
  controlPoints[options.pointIndex * 2] = x
  controlPoints[options.pointIndex * 2 + 1] = y
  const node = getSceneNode(options.document, options.nodeId)
  if (node?.kind === 'deformer' && node.curveAxis !== undefined) {
    controlPoints = moveCurveHandles({
      controlPoints,
      offsetX: x - previousX,
      offsetY: y - previousY,
      pointIndex: options.pointIndex,
    })
  }
  return replaceKeyformDeformer(options.document, binding.id, options.values, {
    ...deformer,
    controlPoints,
    curveHandles: deformer.curveHandles?.map((handle) =>
      handle.pointIndex === options.pointIndex
        ? {
            ...handle,
            horizontal: {
              x: handle.horizontal.x + x - previousX,
              y: handle.horizontal.y + y - previousY,
            },
            vertical: {
              x: handle.vertical.x + x - previousX,
              y: handle.vertical.y + y - previousY,
            },
          }
        : handle,
    ),
  })
}

export interface SetParameterKeyformDeformerCurveHandleOptions extends ParameterDeformerValuesTarget {
  readonly axis: 'horizontal' | 'vertical'
  readonly point: PuppetPoint
  readonly pointIndex: number
}

export const setParameterKeyformDeformerCurveHandle = (
  options: SetParameterKeyformDeformerCurveHandleOptions,
) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const keyform = binding?.keyforms.find((candidate) =>
    parameterValuesEqual(candidate.values, options.values),
  )
  const deformer = keyform?.deformers?.find((candidate) => candidate.nodeId === options.nodeId)
  if (
    binding === undefined ||
    deformer?.kind !== 'deformer' ||
    isSceneNodeLocked(options.document, options.nodeId) ||
    !getParameterTargetDeformerIds(binding).includes(options.nodeId) ||
    !Number.isFinite(options.point.x) ||
    !Number.isFinite(options.point.y) ||
    deformer.curveHandles?.some((handle) => handle.pointIndex === options.pointIndex) !== true
  ) {
    return undefined
  }

  return replaceKeyformDeformer(options.document, binding.id, options.values, {
    ...deformer,
    curveHandles: deformer.curveHandles.map((handle) =>
      handle.pointIndex === options.pointIndex
        ? {
            ...handle,
            [options.axis]: toKeyformPoint(
              options.point,
              options.previewDeformer?.curveHandles?.find(
                (candidate) => candidate.pointIndex === options.pointIndex,
              )?.[options.axis],
              handle[options.axis],
            ),
          }
        : handle,
    ),
  })
}
