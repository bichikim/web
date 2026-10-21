import {getPartRenderProperties} from '../../deformation'
import type {PuppetPart} from '../../player'
import type {EditorInspectorProps} from './EditorInspector'
import {getParameterEditTarget} from './parameter-edit-target'
import {setParameterKeyformPartProperties, setPartRenderProperties} from './part-properties'
import {isSceneNodeLocked} from './scene-graph'

/** The inspected part and how its render properties may be edited. */
export const createPartPropertiesController = (props: EditorInspectorProps) => {
  const getEditTarget = (partId: string) =>
    getParameterEditTarget({
      activeBindingId: props.activeBindingId,
      activeKeyformValues: props.activeKeyformValues,
      editMode: props.editMode,
      nodeId: partId,
      targetNodeIds: props.targetNodeIds,
    })
  const activePart = () => {
    const part = props.document.parts.find((candidate) => candidate.id === props.activeNodeId)
    if (part === undefined || getEditTarget(part.id).kind === 'rest') {
      return part
    }

    return props.previewDocument?.parts.find((candidate) => candidate.id === part.id) ?? part
  }
  const canEditStatic = () =>
    props.activeNodeId !== undefined && !isSceneNodeLocked(props.document, props.activeNodeId)
  const canEditRest = () => props.editingDisabled !== true && canEditStatic()
  const canEditVisual = () => canEditRest() && props.editMode === 'parameter'
  const update = (
    part: PuppetPart,
    properties: Parameters<typeof setPartRenderProperties>[0]['properties'],
    interpolated: boolean,
  ) => {
    const editTarget = getEditTarget(part.id)
    const document =
      interpolated && editTarget.kind === 'keyform'
        ? setParameterKeyformPartProperties({
            bindingId: editTarget.bindingId,
            currentProperties: {
              ...getPartRenderProperties(part),
              drawOrder: part.properties?.drawOrder,
            },
            document: props.document,
            partId: part.id,
            properties: {
              ...properties,
            },
            values: editTarget.values,
          })
        : setPartRenderProperties({document: props.document, partId: part.id, properties})
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }

  return {activePart, canEditRest, canEditStatic, canEditVisual, update}
}
