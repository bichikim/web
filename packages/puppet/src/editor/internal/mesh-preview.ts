import {
  composeParameterScene,
  composeParameterVertices,
  type PuppetParameterValueMap,
} from '../../deformation'
import type {PuppetDocument, PuppetPart} from '../../player/document'
import {sampleMotionParameterValues, sampleMotionVertices} from '../../player/internal/motion'
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
        parameterValues: parameterValueMap,
        time: props.previewTime ?? 0,
      })
}

export const getPartPreviewVertices = (props: MeshEditorProps, part: PuppetPart) => {
  const [motion] = props.document.motions
  const parameterVertices = composeParameterVertices({
    document: props.document,
    parameterValues: getPreviewParameterValues(props),
    partId: part.id,
    restVertices: part.mesh.vertices,
  })

  return props.editMode === 'parameter'
    ? parameterVertices
    : sampleMotionVertices({
        motion,
        partId: part.id,
        restVertices: parameterVertices,
        time: props.previewTime ?? 0,
      })
}

export const getDeformerPreviewDocument = (props: MeshEditorProps): PuppetDocument => ({
  ...props.document,
  scene: composeParameterScene(props.document, getPreviewParameterValues(props)),
})
