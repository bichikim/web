import {difference, union, uniq} from 'es-toolkit/array'

import {
  isTwoDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValues,
  sampleParameterVertices,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameter,
  PuppetParameterBinding,
  PuppetParameterBinding1D,
  PuppetParameterBinding2D,
  PuppetParameterKeyform,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
} from '../../player/document'
import {getDocumentScene} from '../../player/scene'
import {createParameterBindingId, createParameterIds} from './parameter-id'
import {
  createDeformerKeyform,
  createParameterPreview,
  sampleParameterDeformer,
} from './parameter-sampling'

const COORDINATES_PER_VERTEX = 2
const DEFAULT_PARAMETER_MINIMUM = -30
const DEFAULT_PARAMETER_MAXIMUM = 30
const DEFAULT_PARAMETER_VALUE = 0
const TWO_DIMENSIONAL_VALUES = [
  DEFAULT_PARAMETER_MINIMUM,
  DEFAULT_PARAMETER_VALUE,
  DEFAULT_PARAMETER_MAXIMUM,
] as const

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
  return binding !== undefined && isTwoDimensionalParameterBinding(binding)
    ? [parameters[0]?.defaultValue ?? 0, parameters[1]?.defaultValue ?? 0]
    : [parameters[0]?.defaultValue ?? 0]
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
    keyforms: [
      {
        deformers: deformers.map(createDeformerKeyform),
        parts: parts.map((part) => ({partId: part.id, vertices: part.mesh.vertices})),
        values: [DEFAULT_PARAMETER_VALUE],
      },
    ],
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

export const addTwoDimensionalParameter = (
  options: AddParameterOptions,
): AddParameterResult | undefined => {
  const {deformers, parts} = getParameterTargets(options.document, options.nodeIds)
  if (parts.length === 0 && deformers.length === 0) {
    return undefined
  }

  const {ids, index} = createParameterIds(options.document, 2)
  const xId = ids[0]!
  const yId = ids[1]!
  const bindingId = createParameterBindingId(options.document, `${xId}-${yId}`)
  const parameters = [
    createParameter(xId, `Parameter ${index} X`),
    createParameter(yId, `Parameter ${index} Y`),
  ]
  const binding: PuppetParameterBinding2D = {
    id: bindingId,
    keyforms: TWO_DIMENSIONAL_VALUES.flatMap((y) =>
      TWO_DIMENSIONAL_VALUES.map((x) => ({
        deformers: deformers.map(createDeformerKeyform),
        parts: parts.map((part) => ({partId: part.id, vertices: part.mesh.vertices})),
        values: [x, y] as const,
      })),
    ),
    parameterIds: [xId, yId],
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
  const retainedParameterIds = new Set(
    remainingBindings.flatMap((candidate) => candidate.parameterIds),
  )
  const removedParameterIds = new Set(
    binding.parameterIds.filter((parameterId) => !retainedParameterIds.has(parameterId)),
  )
  return {
    ...options.document,
    motions: options.document.motions.map((motion) => ({
      ...motion,
      tracks: motion.tracks.filter(
        (track) => track.kind !== 'parameter' || !removedParameterIds.has(track.parameterId),
      ),
    })),
    parameterBindings: remainingBindings,
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

  if (
    binding === undefined ||
    (parts.length === 0 && deformers.length === 0) ||
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

  const partsKeyforms = parts.map((part) => ({
    partId: part.id,
    vertices: sampleParameterVertices({
      binding,
      partId: part.id,
      restVertices: part.mesh.vertices,
      values: options.values,
    }),
  }))
  const deformerKeyforms = deformers.map((deformer) =>
    sampleParameterDeformer({binding, deformer, values: options.values}),
  )

  return replaceBinding(options.document, options.bindingId, (candidate) => {
    if (isTwoDimensionalParameterBinding(candidate)) {
      const [x, y] = options.values
      if (x === undefined || y === undefined) {
        return candidate
      }

      const keyform = {deformers: deformerKeyforms, parts: partsKeyforms, values: [x, y] as const}
      return {
        ...candidate,
        keyforms: [...candidate.keyforms, keyform].sort(
          (first, second) =>
            first.values[1] - second.values[1] || first.values[0] - second.values[0],
        ),
      }
    }

    const [value] = options.values
    if (value === undefined) {
      return candidate
    }

    const keyform = {
      deformers: deformerKeyforms,
      parts: partsKeyforms,
      values: [value] as const,
    }

    return {
      ...candidate,
      keyforms: [...candidate.keyforms, keyform].sort(
        (first, second) => first.values[0] - second.values[0],
      ),
    }
  })
}

export const deleteParameterKeyform = (options: ParameterValuesTarget) =>
  replaceBinding(options.document, options.bindingId, (binding) => {
    if (options.values.length !== binding.parameterIds.length) {
      return binding
    }

    return {
      ...binding,
      keyforms: binding.keyforms.filter(
        (keyform) => !parameterValuesEqual(keyform.values, options.values),
      ),
    } as PuppetParameterBinding
  })

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
): PuppetParameterBinding => {
  if (isTwoDimensionalParameterBinding(binding)) {
    return {
      ...binding,
      keyforms: binding.keyforms.map((keyform) => ({
        ...keyform,
        deformers: synchronizeKeyformDeformers(keyform, deformers),
        parts: synchronizeKeyformParts(keyform, parts),
      })),
      targetDeformerIds: deformers.map((deformer) => deformer.id),
      targetPartIds: parts.map((part) => part.id),
    }
  }

  return {
    ...binding,
    keyforms: binding.keyforms.map((keyform) => ({
      ...keyform,
      deformers: synchronizeKeyformDeformers(keyform, deformers),
      parts: synchronizeKeyformParts(keyform, parts),
    })),
    targetDeformerIds: deformers.map((deformer) => deformer.id),
    targetPartIds: parts.map((part) => part.id),
  }
}

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
  return replaceBinding(options.document, binding.id, (candidate) => {
    if (isTwoDimensionalParameterBinding(candidate)) {
      return {
        ...candidate,
        keyforms: candidate.keyforms.map((keyform) => ({
          ...keyform,
          deformers: keyform.deformers?.filter((deformer) =>
            targetDeformerIds.has(deformer.nodeId),
          ),
          parts: keyform.parts.filter((part) => targetPartIds.has(part.partId)),
        })),
        targetDeformerIds: [...targetDeformerIds],
        targetPartIds: parts.map((part) => part.id),
      }
    }

    return {
      ...candidate,
      keyforms: candidate.keyforms.map((keyform) => ({
        ...keyform,
        deformers: keyform.deformers?.filter((deformer) => targetDeformerIds.has(deformer.nodeId)),
        parts: keyform.parts.filter((part) => targetPartIds.has(part.partId)),
      })),
      targetDeformerIds: [...targetDeformerIds],
      targetPartIds: parts.map((part) => part.id),
    }
  })
}

export const connectParameterParts = (
  options: ParameterBindingTarget & {readonly partIds: ReadonlyArray<string>},
) => connectParameterNodes({...options, nodeIds: options.partIds})

export const disconnectParameterParts = (
  options: ParameterBindingTarget & {readonly partIds: ReadonlyArray<string>},
) => disconnectParameterNodes({...options, nodeIds: options.partIds})

export const moveParameterKeyform = (options: MoveParameterKeyformOptions) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const parameters = binding === undefined ? [] : getBindingParameters(options.document, binding)

  if (
    binding === undefined ||
    options.values.length !== binding.parameterIds.length ||
    options.nextValues.length !== binding.parameterIds.length ||
    !binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, options.values)) ||
    binding.keyforms.some(
      (keyform) =>
        !parameterValuesEqual(keyform.values, options.values) &&
        parameterValuesEqual(keyform.values, options.nextValues),
    ) ||
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

  return replaceBinding(options.document, options.bindingId, (candidate) => {
    if (isTwoDimensionalParameterBinding(candidate)) {
      const [x, y] = options.nextValues
      if (x === undefined || y === undefined) {
        return candidate
      }

      return {
        ...candidate,
        keyforms: candidate.keyforms
          .map((keyform) =>
            parameterValuesEqual(keyform.values, options.values)
              ? {...keyform, values: [x, y] as const}
              : keyform,
          )
          .sort(
            (first, second) =>
              first.values[1] - second.values[1] || first.values[0] - second.values[0],
          ),
      }
    }

    const [value] = options.nextValues
    if (value === undefined) {
      return candidate
    }

    return {
      ...candidate,
      keyforms: candidate.keyforms
        .map((keyform) =>
          parameterValuesEqual(keyform.values, options.values)
            ? {...keyform, values: [value] as const}
            : keyform,
        )
        .sort((first, second) => first.values[0] - second.values[0]),
    }
  })
}

export {createParameterPreview, sampleParameterVertices}
export {
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerCurveHandle,
  setParameterKeyformDeformerPoint,
} from './parameter-deformer-keyforms'
export {setParameterKeyformVertex} from './parameter-part-keyforms'
