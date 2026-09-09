import {
  isTwoDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValues,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameterKeyform,
  PuppetParameterKeyformBase,
} from '../../player/document'
import {
  addParameter,
  getParameterBinding,
  getParameterTargetNodeIds,
  insertParameterKeyform,
} from './parameter-keyforms'
import {isSceneNodeLocked} from './scene-graph'

interface TemporaryTargetOptions {
  readonly bindingId?: string
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly values: PuppetParameterValues
}

export interface TemporaryTarget {
  readonly bindingId: string
  readonly document: PuppetDocument
  readonly values: PuppetParameterValues
}

export const createTemporaryTarget = (
  options: TemporaryTargetOptions,
): TemporaryTarget | undefined => {
  const binding =
    options.bindingId === undefined
      ? undefined
      : getParameterBinding(options.document, options.bindingId)
  if (binding === undefined || !getParameterTargetNodeIds(binding).includes(options.nodeId)) {
    const result = addParameter({document: options.document, nodeIds: [options.nodeId]})
    return result === undefined
      ? undefined
      : {bindingId: result.binding.id, document: result.document, values: [0]}
  }
  const document = binding.keyforms.some((key) => parameterValuesEqual(key.values, options.values))
    ? options.document
    : insertParameterKeyform({
        bindingId: binding.id,
        document: options.document,
        values: options.values,
      })
  return document === undefined
    ? undefined
    : {bindingId: binding.id, document, values: options.values}
}

interface TemporaryFormTarget extends TemporaryTarget {
  readonly nodeId: string
}

export const readTemporaryForm = (
  options: TemporaryFormTarget,
): PuppetParameterKeyformBase | undefined => {
  const keyform = getParameterBinding(options.document, options.bindingId)?.keyforms.find((key) =>
    parameterValuesEqual(key.values, options.values),
  )
  return keyform === undefined
    ? undefined
    : {
        deformers: keyform.deformers?.filter((node) => node.nodeId === options.nodeId),
        parts: keyform.parts.filter((part) => part.partId === options.nodeId),
      }
}

interface ApplyTemporaryFormOptions extends TemporaryFormTarget {
  readonly form: PuppetParameterKeyformBase
}

export const applyTemporaryForm = (
  options: ApplyTemporaryFormOptions,
): PuppetDocument | undefined => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const target = binding?.keyforms.find((key) => parameterValuesEqual(key.values, options.values))
  if (
    binding === undefined ||
    target === undefined ||
    isSceneNodeLocked(options.document, options.nodeId) ||
    !getParameterTargetNodeIds(binding).includes(options.nodeId)
  ) {
    return undefined
  }
  const part = options.form.parts.find((candidate) => candidate.partId === options.nodeId)
  const deformer = options.form.deformers?.find((candidate) => candidate.nodeId === options.nodeId)
  const targetPart = target.parts.find((candidate) => candidate.partId === options.nodeId)
  const targetDeformer = target.deformers?.find((candidate) => candidate.nodeId === options.nodeId)
  if (
    (part !== undefined && part.vertices.length !== targetPart?.vertices.length) ||
    (deformer !== undefined &&
      (deformer.kind !== targetDeformer?.kind ||
        deformer.controlPoints.length !== targetDeformer.controlPoints.length))
  ) {
    return undefined
  }
  const replace = <Form extends PuppetParameterKeyform>(form: Form): Form =>
    parameterValuesEqual(form.values, options.values)
      ? {
          ...form,
          deformers: form.deformers?.map((candidate) =>
            candidate.nodeId === options.nodeId && deformer !== undefined ? deformer : candidate,
          ),
          parts: form.parts.map((candidate) =>
            candidate.partId === options.nodeId && part !== undefined
              ? {...candidate, ...part}
              : candidate,
          ),
        }
      : form
  const next = isTwoDimensionalParameterBinding(binding)
    ? {...binding, keyforms: binding.keyforms.map(replace)}
    : {...binding, keyforms: binding.keyforms.map(replace)}
  return {
    ...options.document,
    parameterBindings: options.document.parameterBindings?.map((candidate) =>
      candidate.id === binding.id ? next : candidate,
    ),
  }
}
