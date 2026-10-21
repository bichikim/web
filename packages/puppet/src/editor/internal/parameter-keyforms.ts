import {removeInfluenceSources} from './parameter-influences'
import {removeParameterReferences} from './document-references/remove-parameter-references'
import {difference, union, uniq} from 'es-toolkit/array'

import {
  mapBindingKeyforms,
  MAX_PARAMETER_DIMENSIONS,
  type ParameterDimensions,
  parameterValuesEqual,
  type PuppetParameterValues,
  sampleParameterVertices,
  withBindingKeyforms,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameter,
  PuppetParameterBinding,
  PuppetParameterBinding1D,
  PuppetParameterKeyform,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
} from '../../player/document'
import {getDocumentScene} from '../../player/scene'
import {
  canDeleteKeyformPlane,
  compareKeyformValues,
  getKeyformMove,
  toParameterValues,
} from './keyform-grid'
import {createParameterBindingId, createParameterIds} from './parameter-id'
import {getSceneGroup} from './group-properties'
import {sampleKeyformGroups} from './sample-keyform-groups'
import {
  createDeformerKeyform,
  createParameterPreview,
  sampleParameterDeformer,
  samplePartKeyform,
} from './parameter-sampling'

const COORDINATES_PER_VERTEX = 2
const DEFAULT_PARAMETER_MINIMUM = -30
const DEFAULT_PARAMETER_MAXIMUM = 30
const DEFAULT_PARAMETER_VALUE = 0

interface ParameterBindingTarget {
  readonly bindingId: string
  readonly document: PuppetDocument
}

interface ParameterValuesTarget extends ParameterBindingTarget {
  readonly values: PuppetParameterValues
}

export interface MoveParameterKeyformOptions extends ParameterValuesTarget {
  readonly nextValues: PuppetParameterValues
}

export interface AddParameterOptions {
  readonly document: PuppetDocument
  readonly nodeIds: ReadonlyArray<string>
}

export interface AddParameterResult {
  readonly binding: PuppetParameterBinding
  readonly document: PuppetDocument
}

export const getDocumentParameters = (document: PuppetDocument) => document.parameters ?? []
export const getDocumentParameterBindings = (document: PuppetDocument) =>
  document.parameterBindings ?? []
export const getParameterBinding = (document: PuppetDocument, bindingId: string) =>
  getDocumentParameterBindings(document).find((binding) => binding.id === bindingId)

export const getBindingParameters = (document: PuppetDocument, binding: PuppetParameterBinding) => {
  const parameterById = new Map(
    getDocumentParameters(document).map((parameter) => [parameter.id, parameter]),
  )
  return binding.parameterIds.flatMap((parameterId) => {
    const parameter = parameterById.get(parameterId)
    return parameter === undefined ? [] : [parameter]
  })
}

export const getParameterTargetPartIds = (binding: PuppetParameterBinding) => {
  if (binding.targetPartIds !== undefined) {
    return binding.targetPartIds
  }

  return uniq(binding.keyforms.flatMap((keyform) => keyform.parts.map((part) => part.partId)))
}

export const getParameterTargetDeformerIds = (binding: PuppetParameterBinding) =>
  binding.targetDeformerIds ??
  uniq(
    binding.keyforms.flatMap((keyform) =>
      (keyform.deformers ?? []).map((deformer) => deformer.nodeId),
    ),
  )

export const getParameterTargetNodeIds = (binding: PuppetParameterBinding) =>
  uniq([...getParameterTargetPartIds(binding), ...getParameterTargetDeformerIds(binding)])

export const getParameterBindingsForNodeIds = (
  document: PuppetDocument,
  nodeIds: ReadonlyArray<string>,
) => {
  const selectedNodeIds = new Set(nodeIds)
  return getDocumentParameterBindings(document).filter((binding) =>
    getParameterTargetNodeIds(binding).some((nodeId) => selectedNodeIds.has(nodeId)),
  )
}

export const getDefaultParameterValues = (
  document: PuppetDocument,
  binding: PuppetParameterBinding | undefined,
): PuppetParameterValues => {
  const parameters = binding === undefined ? [] : getBindingParameters(document, binding)
  return toParameterValues(
    parameters.map((parameter) => parameter.defaultValue),
    binding?.parameterIds.length ?? 1,
  )
}

const getDocumentParts = (document: PuppetDocument, partIds: ReadonlyArray<string>) => {
  const selectedPartIds = new Set(partIds)
  return document.parts.filter((part) => selectedPartIds.has(part.id))
}

const findSceneNode = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
): PuppetSceneNode | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }

    if (node.kind !== 'part') {
      const child = findSceneNode(node.children, nodeId)
      if (child !== undefined) {
        return child
      }
    }
  }

  return undefined
}

const getDocumentDeformers = (document: PuppetDocument, nodeIds: ReadonlyArray<string>) =>
  nodeIds.flatMap((nodeId) => {
    const node = findSceneNode(getDocumentScene(document).roots, nodeId)
    return node?.kind === 'deformer' ? [node] : []
  })

const getParameterTargets = (document: PuppetDocument, nodeIds: ReadonlyArray<string>) => ({
  deformers: getDocumentDeformers(document, nodeIds),
  parts: getDocumentParts(document, nodeIds),
})

const getPartVertices = (
  keyform: PuppetParameterKeyform,
  partId: string,
  restVertices: ReadonlyArray<number>,
) => keyform.parts.find((part) => part.partId === partId)?.vertices ?? restVertices

const replaceBinding = (
  document: PuppetDocument,
  bindingId: string,
  update: (binding: PuppetParameterBinding) => PuppetParameterBinding,
): PuppetDocument | undefined => {
  const bindings = getDocumentParameterBindings(document)
  if (!bindings.some((binding) => binding.id === bindingId)) {
    return undefined
  }

  return {
    ...document,
    parameterBindings: bindings.map((binding) =>
      binding.id === bindingId ? update(binding) : binding,
    ),
  }
}

const createParameter = (id: string, name: string): PuppetParameter => ({
  defaultValue: DEFAULT_PARAMETER_VALUE,
  id,
  maximum: DEFAULT_PARAMETER_MAXIMUM,
  minimum: DEFAULT_PARAMETER_MINIMUM,
  name,
})

export const addParameter = (options: AddParameterOptions): AddParameterResult | undefined => {
  const {deformers, parts} = getParameterTargets(options.document, options.nodeIds)
  if (parts.length === 0 && deformers.length === 0) {
    return undefined
  }

  const {ids, index} = createParameterIds(options.document, 1)
  const id = ids[0]!
  const parameter = createParameter(id, `Parameter ${index}`)
  const binding: PuppetParameterBinding1D = {
    id,
    keyforms: [],
    parameterIds: [id],
    targetDeformerIds: deformers.map((deformer) => deformer.id),
    targetPartIds: parts.map((part) => part.id),
  }

  return {
    binding,
    document: {
      ...options.document,
      parameterBindings: [...getDocumentParameterBindings(options.document), binding],
      parameters: [...getDocumentParameters(options.document), parameter],
    },
  }
}

const AXIS_NAMES = ['X', 'Y', 'Z'] as const

/** An empty binding over the parameters `ids`, two or three of them. */
const createGridBinding = (id: string, ids: ReadonlyArray<string>): PuppetParameterBinding =>
  ids.length === AXIS_NAMES.length
    ? {id, keyforms: [], parameterIds: [ids[0]!, ids[1]!, ids[2]!]}
    : {id, keyforms: [], parameterIds: [ids[0]!, ids[1] ?? ids[0]!]}

/** 각 축의 파라미터와 키폼이 없는 바인딩을 만든다. */
const addGridParameter = (
  options: AddParameterOptions,
  axes: Exclude<ParameterDimensions, 1>,
): AddParameterResult | undefined => {
  const {deformers, parts} = getParameterTargets(options.document, options.nodeIds)
  if (parts.length === 0 && deformers.length === 0) {
    return undefined
  }

  const {ids, index} = createParameterIds(options.document, axes)
  const bindingId = createParameterBindingId(options.document, ids.join('-'))
  const parameters = ids.map((id, axis) =>
    createParameter(id, `Parameter ${index} ${AXIS_NAMES[axis]}`),
  )
  const binding: PuppetParameterBinding = {
    ...createGridBinding(bindingId, ids),
    targetDeformerIds: deformers.map((deformer) => deformer.id),
    targetPartIds: parts.map((part) => part.id),
  }

  return {
    binding,
    document: {
      ...options.document,
      parameterBindings: [...getDocumentParameterBindings(options.document), binding],
      parameters: [...getDocumentParameters(options.document), ...parameters],
    },
  }
}

export const addTwoDimensionalParameter = (options: AddParameterOptions) =>
  addGridParameter(options, 2)

/** Planes of X/Y keyforms along a third parameter, Cubism's three-parameter keyforms. */
export const addThreeDimensionalParameter = (options: AddParameterOptions) =>
  addGridParameter(options, MAX_PARAMETER_DIMENSIONS)

export const renameParameter = (
  options: ParameterBindingTarget & {readonly name: string; readonly parameterId?: string},
) => {
  const name = options.name.trim()
  const binding = getParameterBinding(options.document, options.bindingId)
  const parameterId = options.parameterId ?? binding?.parameterIds[0]
  if (name.length === 0 || parameterId === undefined) {
    return undefined
  }

  return {
    ...options.document,
    parameters: getDocumentParameters(options.document).map((parameter) =>
      parameter.id === parameterId ? {...parameter, name} : parameter,
    ),
  }
}

export const deleteParameter = (options: ParameterBindingTarget): PuppetDocument | undefined => {
  const binding = getParameterBinding(options.document, options.bindingId)
  if (binding === undefined) {
    return undefined
  }

  const remainingBindings = getDocumentParameterBindings(options.document).filter(
    (candidate) => candidate.id !== binding.id,
  )
  const retainedParameterIds = new Set(remainingBindings.flatMap((item) => item.parameterIds))
  const removedParameterIds = new Set(
    binding.parameterIds.filter((id) => !retainedParameterIds.has(id)),
  )
  return {
    ...removeParameterReferences(options.document, removedParameterIds),
    parameterBindings: removeInfluenceSources(remainingBindings, removedParameterIds),
    parameters: getDocumentParameters(options.document).filter(
      (parameter) => !removedParameterIds.has(parameter.id),
    ),
  }
}

export const insertParameterKeyform = (options: ParameterValuesTarget) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const parameters = binding === undefined ? [] : getBindingParameters(options.document, binding)
  const parts =
    binding === undefined
      ? []
      : getDocumentParts(options.document, getParameterTargetPartIds(binding))
  const deformers =
    binding === undefined
      ? []
      : getDocumentDeformers(options.document, getParameterTargetDeformerIds(binding))
  const keysGroups = (binding?.targetGroupIds ?? []).some(
    (groupId) => getSceneGroup(options.document, groupId) !== undefined,
  )

  if (
    binding === undefined ||
    (parts.length === 0 && deformers.length === 0 && !keysGroups) ||
    options.values.length !== binding.parameterIds.length ||
    parameters.length !== binding.parameterIds.length ||
    binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, options.values)) ||
    options.values.some((value, index) => {
      const parameter = parameters[index]
      return parameter === undefined || value < parameter.minimum || value > parameter.maximum
    })
  ) {
    return undefined
  }

  const {values} = options
  const inserted = {
    deformers: deformers.map((deformer) => sampleParameterDeformer({binding, deformer, values})),
    groups: sampleKeyformGroups(options.document, binding, values),
    parts: parts.map((part) => samplePartKeyform({...options, binding, part, values})),
    values,
  }
  return replaceBinding(options.document, options.bindingId, (candidate) =>
    withBindingKeyforms(
      candidate,
      [...candidate.keyforms, inserted].toSorted((first, second) =>
        compareKeyformValues(first.values, second.values),
      ),
    ),
  )
}

/** 모든 축이 일치하는 키폼 하나만 삭제한다. */
export const deleteParameterKeyform = (options: ParameterValuesTarget) =>
  replaceBinding(options.document, options.bindingId, (binding) =>
    options.values.length === binding.parameterIds.length
      ? withBindingKeyforms(
          binding,
          binding.keyforms.filter(
            (keyform) => !parameterValuesEqual(options.values, keyform.values),
          ),
        )
      : binding,
  )

/** Deletes a 3D binding's plane at third value `value`, keeping at least one plane. */
export const deleteParameterKeyformPlane = (
  options: ParameterBindingTarget & {readonly value: number},
) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  return binding === undefined || !canDeleteKeyformPlane(binding, options.value)
    ? undefined
    : replaceBinding(options.document, options.bindingId, (candidate) =>
        withBindingKeyforms(
          candidate,
          candidate.keyforms.filter((keyform) => keyform.values[2] !== options.value),
        ),
      )
}

const synchronizeKeyformParts = (
  keyform: PuppetParameterKeyform,
  parts: ReadonlyArray<PuppetDocument['parts'][number]>,
) =>
  parts.map(
    (part) =>
      keyform.parts.find((partKeyform) => partKeyform.partId === part.id) ?? {
        partId: part.id,
        vertices: part.mesh.vertices,
      },
  )

const synchronizeKeyformDeformers = (
  keyform: PuppetParameterKeyform,
  deformers: ReadonlyArray<PuppetSceneDeformerNode>,
) =>
  deformers.map(
    (deformer) =>
      keyform.deformers?.find((candidate) => candidate.nodeId === deformer.id) ??
      createDeformerKeyform(deformer),
  )

const synchronizeBindingTargets = (
  binding: PuppetParameterBinding,
  parts: ReadonlyArray<PuppetDocument['parts'][number]>,
  deformers: ReadonlyArray<PuppetSceneDeformerNode>,
): PuppetParameterBinding => ({
  ...mapBindingKeyforms(binding, (keyform) => ({
    ...keyform,
    deformers: synchronizeKeyformDeformers(keyform, deformers),
    parts: synchronizeKeyformParts(keyform, parts),
  })),
  targetDeformerIds: deformers.map((deformer) => deformer.id),
  targetPartIds: parts.map((part) => part.id),
})

interface UpdateParameterTargetsOptions extends ParameterBindingTarget {
  readonly nodeIds: ReadonlyArray<string>
}

export const connectParameterNodes = (options: UpdateParameterTargetsOptions) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  if (binding === undefined) {
    return undefined
  }

  const targetNodeIds = union(getParameterTargetNodeIds(binding), options.nodeIds)
  const {deformers, parts} = getParameterTargets(options.document, targetNodeIds)
  if (parts.length + deformers.length === getParameterTargetNodeIds(binding).length) {
    return undefined
  }

  return replaceBinding(options.document, binding.id, (candidate) =>
    synchronizeBindingTargets(candidate, parts, deformers),
  )
}

export const disconnectParameterNodes = (options: UpdateParameterTargetsOptions) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  if (binding === undefined) {
    return undefined
  }

  const {deformers, parts} = getParameterTargets(
    options.document,
    difference(getParameterTargetNodeIds(binding), options.nodeIds),
  )
  if (parts.length + deformers.length === getParameterTargetNodeIds(binding).length) {
    return undefined
  }

  const targetPartIds = new Set(parts.map((part) => part.id))
  const targetDeformerIds = new Set(deformers.map((deformer) => deformer.id))
  return replaceBinding(options.document, binding.id, (candidate) => ({
    ...mapBindingKeyforms(candidate, (keyform) => ({
      ...keyform,
      deformers: keyform.deformers?.filter((deformer) => targetDeformerIds.has(deformer.nodeId)),
      parts: keyform.parts.filter((part) => targetPartIds.has(part.partId)),
    })),
    targetDeformerIds: [...targetDeformerIds],
    targetPartIds: parts.map((part) => part.id),
  }))
}

export const connectParameterParts = (
  options: ParameterBindingTarget & {readonly partIds: ReadonlyArray<string>},
) => connectParameterNodes({...options, nodeIds: options.partIds})

export const disconnectParameterParts = (
  options: ParameterBindingTarget & {readonly partIds: ReadonlyArray<string>},
) => disconnectParameterNodes({...options, nodeIds: options.partIds})

/** 현재 단면의 키폼 또는 Z 단면 전체의 좌표를 이동한다. */
export const moveParameterKeyform = (options: MoveParameterKeyformOptions) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const parameters = binding === undefined ? [] : getBindingParameters(options.document, binding)
  const move =
    binding === undefined ? undefined : getKeyformMove(binding, options.values, options.nextValues)
  const moved = binding?.keyforms.map((keyform) => move?.(keyform.values) ?? keyform.values) ?? []

  if (
    binding === undefined ||
    move === undefined ||
    options.values.length !== binding.parameterIds.length ||
    options.nextValues.length !== binding.parameterIds.length ||
    !binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, options.values)) ||
    new Set(moved.map((values) => values.join(':'))).size !== moved.length ||
    options.nextValues.some((value, index) => {
      const parameter = parameters[index]
      return (
        parameter === undefined ||
        !Number.isFinite(value) ||
        value < parameter.minimum ||
        value > parameter.maximum
      )
    })
  ) {
    return undefined
  }

  if (parameterValuesEqual(options.nextValues, options.values)) {
    return options.document
  }

  return replaceBinding(options.document, options.bindingId, (candidate) =>
    withBindingKeyforms(
      candidate,
      candidate.keyforms
        .map((keyform) => ({...keyform, values: move(keyform.values)}))
        .toSorted((first, second) => compareKeyformValues(first.values, second.values)),
    ),
  )
}
export {createParameterPreview, sampleParameterVertices}
export {
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerCurveHandle,
  setParameterKeyformDeformerPoint,
} from './parameter-deformer-keyforms'
export {setParameterKeyformVertex} from './parameter-part-keyforms'
