import {sampleParameterGlue} from '../../deformation/parameter-glue'
import type {PuppetParameterValues} from '../../deformation'
import {getParameterBinding, getParameterTargetPartIds} from './parameter-keyforms'
import {createSignal} from 'solid-js'
import type {PuppetDocument, PuppetGlue, PuppetVertexReference} from '../../player'
import {addGlue, canGlueVertex, setGlueKeyform, updateGlue} from './glue'
import {getSceneNode, isSceneNodeLocked} from './scene-graph'

export interface GlueEditorProps {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly editMode?: 'parameter' | 'motion'
  readonly editingDocument?: PuppetDocument
  readonly onKeyformChange?: (document: PuppetDocument) => void
  readonly sourceVertex?: PuppetVertexReference | null
  readonly onSourceChange?: (vertex: PuppetVertexReference | null) => void
  readonly document: PuppetDocument
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetPartId?: string
  readonly partId?: string
  readonly vertexIndex?: number | null
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditStart?: () => void
  readonly onEditEnd?: () => void
}

export const useGlueEditor = (props: GlueEditorProps) => {
  const PERCENT = 100
  const [localFirst, setLocalFirst] = createSignal<PuppetVertexReference | null>(null)
  const first = () => (props.sourceVertex === undefined ? localFirst() : props.sourceVertex)
  const setFirst = (vertex: PuppetVertexReference | null) => {
    setLocalFirst(vertex)
    props.onSourceChange?.(vertex)
  }
  const selected = (): PuppetVertexReference | undefined =>
    props.partId === undefined || props.vertexIndex === null || props.vertexIndex === undefined
      ? undefined
      : {partId: props.partId, vertexIndex: props.vertexIndex}
  const selectable = () => {
    const vertex = selected()
    return vertex !== undefined && canGlueVertex(props.document, vertex)
  }
  const label = (vertex: PuppetGlue['second']) => {
    const name = getSceneNode(props.document, vertex.partId)?.name ?? vertex.partId
    if ('edge' in vertex) {
      const segment = `${vertex.vertexIndex + 1}–${vertex.edge.endIndex + 1}`
      return `${name} · 경계 ${segment} (${Math.round(vertex.edge.position * PERCENT)}%)`
    }
    return `${name} · 정점 ${vertex.vertexIndex + 1}`
  }
  const connect = () => {
    const source = first()
    const target = selected()
    if (source === null || target === undefined) {
      return
    }
    const document = addGlue(props.document, source, target)
    if (document !== undefined) {
      props.onDocumentChange?.(document)
      setFirst(null)
    }
  }
  const editingDocument = () => props.editingDocument ?? props.document
  const binding = () =>
    props.activeBindingId === undefined
      ? undefined
      : getParameterBinding(editingDocument(), props.activeBindingId)
  const hasParameter = (glue: PuppetGlue) =>
    props.document.parameterBindings?.some((binding) =>
      getParameterTargetPartIds(binding).includes(glue.first.partId),
    ) === true
  const canEdit = (glue: PuppetGlue) =>
    props.editMode !== 'motion' &&
    !isSceneNodeLocked(props.document, glue.first.partId) &&
    !isSceneNodeLocked(props.document, glue.second.partId) &&
    (props.editMode !== 'parameter' ||
      !hasParameter(glue) ||
      (props.partId === glue.first.partId &&
        props.activeKeyformValues !== undefined &&
        props.activeKeyformValues !== null &&
        binding()?.keyforms.some((form) =>
          form.parts.some((part) => part.partId === glue.first.partId),
        ) === true))
  const sampled = (glue: PuppetGlue) => {
    const current = binding()
    const values = props.activeKeyformValues
    return !hasParameter(glue) || current === undefined || values === undefined || values === null
      ? glue
      : sampleParameterGlue({binding: current, glue, values})
  }
  const change = (glue: PuppetGlue, values: Pick<PuppetGlue, 'weight' | 'strength'> | null) => {
    if (values !== null && !canEdit(glue)) {
      return
    }
    if (values !== null && props.editMode === 'parameter' && hasParameter(glue)) {
      const bindingId = props.activeBindingId
      const keyformValues = props.activeKeyformValues
      if (
        !canEdit(glue) ||
        bindingId === undefined ||
        keyformValues === undefined ||
        keyformValues === null
      ) {
        return
      }
      const document = setGlueKeyform({
        bindingId,
        changes: values,
        document: editingDocument(),
        glueId: glue.id,
        values: keyformValues,
      })
      if (document !== undefined) {
        props.onKeyformChange?.(document)
      }
      return
    }
    const document = updateGlue(props.document, glue.id, values)
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const connections = () =>
    (props.document.glue ?? []).filter(
      (glue) =>
        glue.first.partId === props.partId ||
        glue.second.partId === props.partId ||
        props.selectedPartIds?.includes(glue.first.partId) ||
        props.selectedPartIds?.includes(glue.second.partId),
    )
  return {
    first,
    hasParameter,
    canEdit,
    label,
    change,
    selected,
    connect,
    setFirst,
    connections,
    selectable,
    sampled,
  }
}
