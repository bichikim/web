import {composeParameterGlue} from '../../deformation/parameter-glue'
import {getRestPreview} from './rest-preview'
import {getParameterEditingDocument} from './parameter-sampling'
import {
  composeParameterScene,
  composeParameterVertices,
  type PuppetParameterValueMap,
} from '../../deformation'
import type {PuppetDocument, PuppetPart, PuppetPoint} from '../../player/document'
import {sampleMotionParameterValues, sampleMotionVertices} from '../../player/internal/motion'
import {getSpatialPartPose} from '../../player/internal/spatial-part'
import type {MeshEditorProps} from '../mesh-editor-contract'
import {getParameterBinding} from './parameter-keyforms'

const getPreviewParameterValues = (props: MeshEditorProps) => {
  const activeBinding =
    props.activeBindingId === undefined
      ? undefined
      : getParameterBinding(props.document, props.activeBindingId)
  const activeParameterValues =
    activeBinding === undefined || props.parameterValues === undefined
      ? {}
      : Object.fromEntries(
          activeBinding.parameterIds.flatMap((parameterId, index) => {
            const value = props.parameterValues?.[index]
            return value === undefined ? [] : [[parameterId, value] as const]
          }),
        )
  const parameterValueMap: PuppetParameterValueMap = {
    ...props.parameterValueMap,
    ...activeParameterValues,
  }
  const [motion] = props.document.motions

  return props.editMode === 'parameter'
    ? parameterValueMap
    : sampleMotionParameterValues({
        motion,
        parameters: props.document.parameters,
        parameterValues: parameterValueMap,
        time: props.previewTime ?? 0,
      })
}

export const getPartPreviewVertices = (props: MeshEditorProps, part: PuppetPart) => {
  if (props.meshEditing) {
    return part.mesh.vertices
  }
  const [motion] = props.document.motions
  const parameterValues = getPreviewParameterValues(props)
  const parameterVertices = composeParameterVertices({
    document: getParameterEditingDocument(
      props.document,
      props.editMode === 'parameter' ? props.activeBindingId : undefined,
    ),
    parameterValues,
    partId: part.id,
    restVertices: part.mesh.vertices,
  })

  const vertices =
    props.editMode === 'parameter'
      ? parameterVertices
      : sampleMotionVertices({
          motion,
          partId: part.id,
          restVertices: parameterVertices,
          time: props.previewTime ?? 0,
        })
  const pose = getSpatialPartPose({document: props.document, parameterValues, part})
  return pose === undefined
    ? vertices
    : vertices.map(
        (coordinate, index) => coordinate + pose.vertices[index]! - part.mesh.vertices[index]!,
      )
}

/** Removes the projected 3D offset before a displayed vertex is saved as a 2D edit. */
export const unapplyPartPreviewSpatialPose = (
  props: MeshEditorProps,
  part: PuppetPart,
  vertexIndex: number,
  point: PuppetPoint,
): PuppetPoint => {
  const pose = getSpatialPartPose({
    document: props.document,
    parameterValues: getPreviewParameterValues(props),
    part,
  })
  if (pose === undefined || props.meshEditing) {
    return point
  }
  const index = vertexIndex * 2
  return {
    x: point.x - pose.vertices[index]! + part.mesh.vertices[index]!,
    y: point.y - pose.vertices[index + 1]! + part.mesh.vertices[index + 1]!,
  }
}

export const getDeformerPreviewDocument = (props: MeshEditorProps): PuppetDocument =>
  props.meshEditing
    ? getRestPreview(props.document)
    : {
        ...props.document,
        glue: composeParameterGlue({
          document: getParameterEditingDocument(
            props.document,
            props.editMode === 'parameter' ? props.activeBindingId : undefined,
          ),
          parameterValues: getPreviewParameterValues(props),
        }),
        scene: composeParameterScene(
          getParameterEditingDocument(
            props.document,
            props.editMode === 'parameter' ? props.activeBindingId : undefined,
          ),
          getPreviewParameterValues(props),
        ),
      }
