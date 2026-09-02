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
} from '../../player'
import {
  getDocumentParameterBindings,
  getParameterBinding,
  getParameterTargetDeformerIds,
} from './parameter-keyforms'
import {isSceneNodeLocked} from './scene-graph'

interface ParameterDeformerValuesTarget {
  readonly bindingId: string
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly values: PuppetParameterValues
}

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

  return replaceKeyformDeformer(options.document, binding.id, options.values, {
    ...deformer,
    controlPoints: options.controlPoints,
    ...(options.curveHandles === undefined ? {} : {curveHandles: options.curveHandles}),
  })
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
    !Number.isFinite(options.x) ||
    !Number.isFinite(options.y)
  ) {
    return undefined
  }

  const controlPoints = [...deformer.controlPoints]
  const previousX = controlPoints[options.pointIndex * 2] ?? 0
  const previousY = controlPoints[options.pointIndex * 2 + 1] ?? 0
  controlPoints[options.pointIndex * 2] = options.x
  controlPoints[options.pointIndex * 2 + 1] = options.y
  return replaceKeyformDeformer(options.document, binding.id, options.values, {
    ...deformer,
    controlPoints,
    curveHandles: deformer.curveHandles?.map((handle) =>
      handle.pointIndex === options.pointIndex
        ? {
            ...handle,
            horizontal: {
              x: handle.horizontal.x + options.x - previousX,
              y: handle.horizontal.y + options.y - previousY,
            },
            vertical: {
              x: handle.vertical.x + options.x - previousX,
              y: handle.vertical.y + options.y - previousY,
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
        ? {...handle, [options.axis]: options.point}
        : handle,
    ),
  })
}
