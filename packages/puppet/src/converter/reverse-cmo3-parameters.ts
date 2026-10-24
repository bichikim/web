import type {PuppetDocument} from '../player/document'
import {parseDocumentValue} from '../player/parse-document'

/** CMO3 리깅의 지정한 축을 범위 중간값 기준으로 뒤집는다. SDK 모션을 결합하기 전에 호출한다. */
export const reverseCmo3Parameters = (
  document: PuppetDocument,
  parameterIds: ReadonlyArray<string>,
): PuppetDocument => {
  const reversed = new Set(parameterIds)
  const parameters = document.parameters ?? []
  const centers = new Map(
    parameters.map((parameter) => [parameter.id, parameter.minimum + parameter.maximum]),
  )
  if (reversed.size === 0 || parameterIds.some((id) => !centers.has(id))) {
    throw new Error('CMO3 axis reversal requires known parameter IDs')
  }
  const reverse = (id: string, value: number) =>
    reversed.has(id) ? centers.get(id)! - value : value
  const converted = {
    ...document,
    parameterBindings: document.parameterBindings?.map((binding) => ({
      ...binding,
      influences: binding.influences?.map((influence) => ({
        ...influence,
        points: influence.points
          .map((point) => ({...point, value: reverse(influence.parameterId, point.value)}))
          .sort((first, second) => first.value - second.value),
      })),
      keyforms: binding.keyforms
        .map((form) => ({
          ...form,
          values: form.values.map((value, index) => reverse(binding.parameterIds[index]!, value)),
        }))
        .sort((first, second) => first.values[0]! - second.values[0]!),
    })),
    parameters: parameters.map((parameter) => ({
      ...parameter,
      defaultValue: reverse(parameter.id, parameter.defaultValue),
    })),
  }
  const parsed = parseDocumentValue(converted)
  if (!parsed.ok) {
    throw new Error('Reversed CMO3 parameter axes are not a valid Poffo document')
  }
  return parsed.document
}
