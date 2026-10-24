import {uniq} from 'es-toolkit/array'
import {getDirectGlueIds} from '../../deformation/get-direct-glue-ids'
import type {PuppetDocument, PuppetGlue, PuppetParameterBinding} from '../../player/document'

const EMPTY_GLUE: ReadonlyArray<PuppetGlue> = []
const targetNodes = new WeakMap<
  PuppetParameterBinding,
  WeakMap<ReadonlyArray<PuppetGlue>, ReadonlyArray<string>>
>()

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

/** 직접 편집 대상을 반환한다. document를 주면 직접 연결한 Glue의 양 끝 파트도 포함한다. */
const readTargetNodeIds = (binding: PuppetParameterBinding, document?: PuppetDocument) => {
  const glueIds = new Set(getDirectGlueIds(binding))
  const endpoints =
    document === undefined || glueIds.size === 0
      ? []
      : (document.glue ?? [])
          .filter((glue) => glueIds.has(glue.id))
          .flatMap((glue) => [glue.first.partId, glue.second.partId])
  return uniq([
    ...getParameterTargetPartIds(binding),
    ...getParameterTargetDeformerIds(binding),
    ...endpoints,
  ])
}

export const getParameterTargetNodeIds = (
  binding: PuppetParameterBinding,
  document?: PuppetDocument,
): ReadonlyArray<string> => {
  const glue = document?.glue ?? EMPTY_GLUE
  let byGlue = targetNodes.get(binding)
  if (byGlue === undefined) {
    byGlue = new WeakMap()
    targetNodes.set(binding, byGlue)
  }
  let targets = byGlue.get(glue)
  if (targets === undefined) {
    targets = readTargetNodeIds(binding, document)
    byGlue.set(glue, targets)
  }
  return targets
}
