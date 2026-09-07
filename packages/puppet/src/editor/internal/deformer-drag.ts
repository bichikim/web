import type {PuppetParameterValues} from '../../deformation'
import type {PuppetDocument, PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import type {DeformerDragTarget} from './deformer-control-selection'
import {getParameterEditTarget} from './parameter-edit-target'
import {setDeformerControlPoint, setDeformerControlPoints} from './deformer-control-points'
import {setDeformerCurveHandle} from './deformer-curve-handles'
import {
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerCurveHandle,
  setParameterKeyformDeformerPoint,
} from './parameter-keyforms'
import {
  getDeformerAngle,
  getDeformerRotationOrigin,
  reflectCurveHandlePoint,
  rotateDeformerControlPoints,
  rotateDeformerCurveHandles,
  translateDeformerControlPoints,
  translateDeformerCurveHandles,
} from './deformer-transform'
const DEGREES_PER_HALF_ROTATION = 180

interface UpdateDraggedDeformerOptions {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly deformer?: PuppetSceneDeformerNode
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly nodeId: string
  readonly point: PuppetPoint
  readonly target: DeformerDragTarget
  readonly rotationAngle?: number
  readonly targetNodeIds?: ReadonlyArray<string>
}

export const updateDraggedDeformer = (options: UpdateDraggedDeformerOptions) => {
  const editTarget = getParameterEditTarget({
    activeBindingId: options.activeBindingId,
    activeKeyformValues: options.activeKeyformValues,
    editMode: options.editMode,
    nodeId: options.nodeId,
    targetNodeIds: options.targetNodeIds,
  })

  if (options.target.kind === 'controlPoint') {
    return editTarget.kind === 'keyform'
      ? setParameterKeyformDeformerPoint({
          bindingId: editTarget.bindingId,
          document: options.document,
          nodeId: options.nodeId,
          pointIndex: options.target.pointIndex,
          values: editTarget.values,
          x: options.point.x,
          y: options.point.y,
        })
      : setDeformerControlPoint({
          document: options.document,
          nodeId: options.nodeId,
          pointIndex: options.target.pointIndex,
          x: options.point.x,
          y: options.point.y,
        })
  }

  if (options.target.kind === 'curveHandle') {
    if (options.deformer === undefined) {
      return undefined
    }

    const point = reflectCurveHandlePoint({
      axis: options.target.axis,
      deformer: options.deformer,
      point: options.point,
      pointIndex: options.target.pointIndex,
    })
    return editTarget.kind === 'keyform'
      ? setParameterKeyformDeformerCurveHandle({
          axis: options.target.axis,
          bindingId: editTarget.bindingId,
          document: options.document,
          nodeId: options.nodeId,
          point,
          pointIndex: options.target.pointIndex,
          values: editTarget.values,
        })
      : setDeformerCurveHandle({
          axis: options.target.axis,
          document: options.document,
          nodeId: options.nodeId,
          point,
          pointIndex: options.target.pointIndex,
        })
  }

  if (options.deformer === undefined) {
    return undefined
  }

  const origin = getDeformerRotationOrigin(options.deformer)

  if (options.target.kind === 'rotationOrigin') {
    const geometry = {
      controlPoints: options.deformer.controlPoints,
      curveHandles: options.deformer.curveHandles,
      rotationOrigin: options.point,
    }
    return editTarget.kind === 'keyform'
      ? setParameterKeyformDeformerControlPoints({
          bindingId: editTarget.bindingId,
          document: options.document,
          nodeId: options.nodeId,
          values: editTarget.values,
          ...geometry,
        })
      : setDeformerControlPoints({...geometry, document: options.document, nodeId: options.nodeId})
  }

  const isTranslation = options.target.kind === 'translation'
  const offset = isTranslation
    ? {
        x: options.point.x - options.target.previousPoint.x,
        y: options.point.y - options.target.previousPoint.y,
      }
    : {x: options.point.x - origin.x, y: options.point.y - origin.y}
  const degrees =
    (Math.atan2(options.point.y - origin.y, options.point.x - origin.x) *
      DEGREES_PER_HALF_ROTATION) /
      Math.PI -
    (options.rotationAngle ?? getDeformerAngle(options.deformer))
  const controlPoints = isTranslation
    ? translateDeformerControlPoints({
        controlPoints: options.deformer.controlPoints,
        offset,
      })
    : rotateDeformerControlPoints({
        controlPoints: options.deformer.controlPoints,
        degrees,
        origin,
      })
  const curveHandles = isTranslation
    ? translateDeformerCurveHandles({curveHandles: options.deformer.curveHandles, offset})
    : rotateDeformerCurveHandles({
        curveHandles: options.deformer.curveHandles,
        degrees,
        origin,
      })
  const rotationOrigin = isTranslation ? {x: origin.x + offset.x, y: origin.y + offset.y} : origin

  return editTarget.kind === 'keyform'
    ? setParameterKeyformDeformerControlPoints({
        bindingId: editTarget.bindingId,
        controlPoints,
        curveHandles,
        document: options.document,
        nodeId: options.nodeId,
        rotationOrigin,
        values: editTarget.values,
      })
    : setDeformerControlPoints({
        controlPoints,
        curveHandles,
        document: options.document,
        nodeId: options.nodeId,
        rotationOrigin,
      })
}
