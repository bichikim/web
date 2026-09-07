import type {PuppetDocument} from '../../player/document'

export const createParameterIds = (document: PuppetDocument, count: number) => {
  const ids = new Set((document.parameters ?? []).map((parameter) => parameter.id))
  const bindingIds = new Set((document.parameterBindings ?? []).map((binding) => binding.id))
  let index = Math.max(ids.size, bindingIds.size) + 1

  while (
    Array.from({length: count}, (_, offset) => `parameter-${index + offset}`).some(
      (id) => ids.has(id) || bindingIds.has(id),
    )
  ) {
    index += 1
  }

  return {ids: Array.from({length: count}, (_, offset) => `parameter-${index + offset}`), index}
}

export const createParameterBindingId = (document: PuppetDocument, baseId: string) => {
  const bindingIds = new Set((document.parameterBindings ?? []).map((binding) => binding.id))
  let id = baseId
  let suffix = 2

  while (bindingIds.has(id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }

  return id
}
