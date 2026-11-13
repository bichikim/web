import {type PuppetSceneDeformerNode, type PuppetSceneNode} from '../../../player'
import {
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerPoint,
} from '../parameter-keyforms'
import {
  getDeformerAngle,
  getDeformerRotationOrigin,
  rotateDeformerControlPoints,
  rotateDeformerCurveHandles,
} from '../deformer-transform'
import {setDeformerControlPoint, setDeformerControlPoints} from '../deformer-control-points'
import {getParameterEditTarget} from '../parameter-edit-target'
import type {EditorInspectorProps, TransformProperty} from './types'

const getTransformedGeometry = (
  node: PuppetSceneDeformerNode,
  property: TransformProperty,
  value: number,
) => {
  const origin = getDeformerRotationOrigin(node)

  switch (property) {
    case 'angle': {
      const degrees = value - getDeformerAngle(node)
      return {
        controlPoints: rotateDeformerControlPoints({
          controlPoints: node.controlPoints,
          degrees,
          origin,
        }),
        curveHandles: rotateDeformerCurveHandles({
          curveHandles: node.curveHandles,
          degrees,
          origin,
        }),
        rotationOrigin: origin,
      }
    }
    case 'rotationOriginX': {
      return {
        controlPoints: node.controlPoints,
        curveHandles: node.curveHandles,
        rotationOrigin: {...origin, x: value},
      }
    }
    case 'rotationOriginY': {
      return {
        controlPoints: node.controlPoints,
        curveHandles: node.curveHandles,
        rotationOrigin: {...origin, y: value},
      }
    }
    default: {
      const exhaustiveProperty: never = property
      return exhaustiveProperty
    }
  }
}

const updateInspectorTransform = (
  props: EditorInspectorProps,
  node: PuppetSceneDeformerNode,
  property: TransformProperty,
  value: number,
) => {
  const geometry = getTransformedGeometry(node, property, value)
  const editTarget = getParameterEditTarget({
    activeBindingId: props.activeBindingId,
    activeKeyformValues: props.activeKeyformValues,
    editMode: props.editMode,
    nodeId: node.id,
    targetNodeIds: props.targetNodeIds,
  })

  if (editTarget.kind === 'rest') {
    return setDeformerControlPoints({...geometry, document: props.document, nodeId: node.id})
  }

  return setParameterKeyformDeformerControlPoints({
    bindingId: editTarget.bindingId,
    ...geometry,
    document: props.document,
    nodeId: node.id,
    previewDeformer: node,
    values: editTarget.values,
  })
}

interface UpdateInspectorGridOptions {
  readonly axis: 'x' | 'y'
  readonly node: PuppetSceneDeformerNode
  readonly pointIndex: number
  readonly props: EditorInspectorProps
  readonly value: number
}

const updateInspectorGrid = (options: UpdateInspectorGridOptions) => {
  const x =
    options.axis === 'x' ? options.value : (options.node.controlPoints[options.pointIndex * 2] ?? 0)
  const y =
    options.axis === 'y'
      ? options.value
      : (options.node.controlPoints[options.pointIndex * 2 + 1] ?? 0)

  const editTarget = getParameterEditTarget({
    activeBindingId: options.props.activeBindingId,
    activeKeyformValues: options.props.activeKeyformValues,
    editMode: options.props.editMode,
    nodeId: options.node.id,
    targetNodeIds: options.props.targetNodeIds,
  })

  if (editTarget.kind === 'rest') {
    return setDeformerControlPoint({
      document: options.props.document,
      nodeId: options.node.id,
      pointIndex: options.pointIndex,
      x,
      y,
    })
  }

  return setParameterKeyformDeformerPoint({
    bindingId: editTarget.bindingId,
    document: options.props.document,
    nodeId: options.node.id,
    pointIndex: options.pointIndex,
    previewDeformer: options.node,
    values: editTarget.values,
    x,
    y,
  })
}

/** Transform and grid point edits of the inspected deformer. */
export const createInspectorNodeActions = (
  props: EditorInspectorProps,
  activeNode: () => PuppetSceneNode | undefined,
) => {
  const handleTransformChange = (property: TransformProperty, value: number) => {
    const node = activeNode()
    if (node?.kind !== 'deformer') {
      return
    }
    const document = updateInspectorTransform(props, node, property, value)
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const handleGridPointChange = (pointIndex: number, axis: 'x' | 'y', value: number) => {
    const node = activeNode()
    if (node?.kind !== 'deformer') {
      return
    }
    const document = updateInspectorGrid({axis, node, pointIndex, props, value})

    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  return {handleGridPointChange, handleTransformChange}
}
