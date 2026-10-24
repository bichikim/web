import {MAX_PARAMETER_DIMENSIONS, type PuppetParameterBinding} from '../player/document'
import {createCubismBinding, type CubismBinding} from './create-cubism-binding'

/** 다축 Cubism 격자를 네이티브 문서의 3축 단면으로 나누고 나머지 축의 가중치를 곱한다. */
export const createCubismBindings = (
  binding: CubismBinding,
): ReadonlyArray<PuppetParameterBinding> => {
  if (binding.parameterIds.length <= MAX_PARAMETER_DIMENSIONS) {
    return [createCubismBinding(binding)]
  }
  const size = binding.parameterIds.reduce(
    (count, _, axis) => count * new Set(binding.keyforms.map((form) => form.values[axis])).size,
    1,
  )
  const unique = new Set(binding.keyforms.map((form) => JSON.stringify(form.values))).size
  if (size !== binding.keyforms.length || unique !== size) {
    throw new Error(`Cubism ${binding.id} keyform grid is incomplete`)
  }
  const axes = binding.parameterIds.slice(MAX_PARAMETER_DIMENSIONS).map((parameterId, offset) => ({
    keys: [
      ...new Set(binding.keyforms.map((form) => form.values[offset + MAX_PARAMETER_DIMENSIONS]!)),
    ].sort((first, second) => first - second),
    parameterId,
  }))
  const slices = new Map<string, Array<CubismBinding['keyforms'][number]>>()
  for (const form of binding.keyforms) {
    const key = JSON.stringify(form.values.slice(MAX_PARAMETER_DIMENSIONS))
    const forms = slices.get(key) ?? []
    forms.push(form)
    slices.set(key, forms)
  }
  return Array.from(slices, ([, forms], index) => {
    const extra = forms[0]!.values.slice(MAX_PARAMETER_DIMENSIONS)
    return createCubismBinding({
      ...binding,
      id: `${binding.id}:slice:${index}`,
      influenceMode: 'multiply',
      influences: axes.map((axis, offset) => ({
        parameterId: axis.parameterId,
        points: axis.keys.map((value) => ({value, weight: value === extra[offset] ? 1 : 0})),
      })),
      keyforms: forms.map((form) => ({
        ...form,
        values: form.values.slice(0, MAX_PARAMETER_DIMENSIONS),
      })),
      parameterIds: binding.parameterIds.slice(0, MAX_PARAMETER_DIMENSIONS),
    })
  })
}
