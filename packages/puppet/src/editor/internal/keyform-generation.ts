import {
  isTwoDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValues,
  sampleParameterDeformer,
} from '../../deformation'
import {validateMesh} from '../../mesh'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterKeyform,
  PuppetSceneDeformerNode,
} from '../../player'
import {
  getBindingParameters,
  getParameterBinding,
  getParameterTargetDeformerIds,
  getParameterTargetNodeIds,
  getParameterTargetPartIds,
} from './parameter-keyforms'
import {samplePartKeyform} from './parameter-sampling'
import {getSceneNode, isSceneNodeLocked} from './scene-graph'

export interface KeyformGenerationTarget {
  readonly document: PuppetDocument
  readonly bindingId: string
}
export interface KeyformGenerationSuccess {
  readonly ok: true
  readonly document: PuppetDocument
}
export interface KeyformGenerationFailure {
  readonly ok: false
  readonly message: string
}
export type KeyformGenerationResult = KeyformGenerationSuccess | KeyformGenerationFailure

export const getKeyformGenerationContext = (options: KeyformGenerationTarget) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  if (binding === undefined) {
    return {message: '편집할 파라미터를 선택하세요.', ok: false} as const
  }
  const targetIds = getParameterTargetNodeIds(binding)
  if (targetIds.length === 0 || targetIds.some((id) => isSceneNodeLocked(options.document, id))) {
    return {message: '연결된 대상이 없거나 잠긴 레이어가 있습니다.', ok: false} as const
  }
  const parameters = getBindingParameters(options.document, binding)
  if (parameters.length !== binding.parameterIds.length) {
    return {message: '파라미터 범위를 찾지 못했습니다.', ok: false} as const
  }
  const partIds = new Set(getParameterTargetPartIds(binding))
  const parts = options.document.parts.filter((part) => partIds.has(part.id))
  const deformers = getParameterTargetDeformerIds(binding).flatMap((id) => {
    const node = getSceneNode(options.document, id)
    return node?.kind === 'deformer' ? [node] : []
  })
  if (parts.length + deformers.length !== targetIds.length) {
    return {message: '연결된 레이어를 찾지 못했습니다.', ok: false} as const
  }
  return {binding, deformers, ok: true, parameters, parts} as const
}

export const sampleBindingKeyform = (
  options: KeyformGenerationTarget,
  binding: PuppetParameterBinding,
  values: PuppetParameterValues,
  deformers: readonly PuppetSceneDeformerNode[],
): PuppetParameterKeyform => {
  const partIds = new Set(getParameterTargetPartIds(binding))
  const geometry = {
    deformers: deformers.map((deformer) => sampleParameterDeformer({binding, deformer, values})),
    parts: options.document.parts
      .filter((part) => partIds.has(part.id))
      .map((part) => samplePartKeyform({...options, binding, part, values})),
  }
  return values.length === 2
    ? {...geometry, values: [values[0], values[1]]}
    : {...geometry, values: [values[0]]}
}

export const replaceGeneratedKeyforms = (
  options: KeyformGenerationTarget,
  binding: PuppetParameterBinding,
  generated: readonly PuppetParameterKeyform[],
): KeyformGenerationResult => {
  const invalid = generated.some((keyform) =>
    keyform.parts.some((entry) => {
      const part = options.document.parts.find((candidate) => candidate.id === entry.partId)
      return part === undefined || !validateMesh({...part.mesh, vertices: entry.vertices}).valid
    }),
  )
  if (invalid) {
    return {message: '생성된 메시가 유효하지 않습니다. 기준 형태와 변형량을 확인하세요.', ok: false}
  }
  const retained = binding.keyforms.filter(
    (keyform) =>
      !generated.some((candidate) => parameterValuesEqual(candidate.values, keyform.values)),
  )
  const keyforms = [...retained, ...generated].toSorted(
    (first, second) =>
      (first.values[1] ?? 0) - (second.values[1] ?? 0) || first.values[0] - second.values[0],
  )
  const updated: PuppetParameterBinding = isTwoDimensionalParameterBinding(binding)
    ? {
        ...binding,
        keyforms: keyforms.map((keyform) => ({
          ...keyform,
          values: [keyform.values[0], keyform.values[1]!] as const,
        })),
      }
    : {
        ...binding,
        keyforms: keyforms.map((keyform) => ({...keyform, values: [keyform.values[0]] as const})),
      }
  return {
    document: {
      ...options.document,
      parameterBindings: options.document.parameterBindings?.map((candidate) =>
        candidate.id === binding.id ? updated : candidate,
      ),
    },
    ok: true,
  }
}
