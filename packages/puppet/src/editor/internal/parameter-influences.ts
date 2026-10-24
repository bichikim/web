import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterInfluence,
} from '../../player/document'
import {hasValidInfluences, isParameterInfluences} from '../../player/internal/parse-influence'

export interface SetParameterInfluencesOptions {
  readonly bindingId: string
  readonly document: PuppetDocument
  readonly influences: ReadonlyArray<PuppetParameterInfluence>
}

export const setParameterInfluences = (
  options: SetParameterInfluencesOptions,
): PuppetDocument | undefined => {
  const bindings = options.document.parameterBindings ?? []
  if (
    !bindings.some((binding) => binding.id === options.bindingId) ||
    !isParameterInfluences(options.influences) ||
    !hasValidInfluences(options.influences, options.document.parameters ?? [])
  ) {
    return undefined
  }
  return {
    ...options.document,
    parameterBindings: bindings.map((binding) =>
      binding.id === options.bindingId ? {...binding, influences: options.influences} : binding,
    ),
  }
}

export const removeInfluenceSources = (
  bindings: ReadonlyArray<PuppetParameterBinding>,
  removedIds: ReadonlySet<string>,
): ReadonlyArray<PuppetParameterBinding> =>
  bindings.map((binding) =>
    binding.influences === undefined
      ? binding
      : {
          ...binding,
          influences: binding.influences.filter(
            (relation) => !removedIds.has(relation.parameterId),
          ),
        },
  )
