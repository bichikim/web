import {
  MAX_PARAMETER_DIMENSIONS,
  type PuppetParameterBinding,
  type PuppetParameterBindingBase,
  type PuppetParameterKeyformBase,
} from '../player/document'

interface Keyform extends PuppetParameterKeyformBase {
  readonly values: ReadonlyArray<number>
}

export interface CubismBinding extends PuppetParameterBindingBase {
  readonly parameterIds: ReadonlyArray<string>
  readonly keyforms: ReadonlyArray<Keyform>
}

/** Cubism의 축 개수를 검증하고 대응하는 Poffo 키폼 차원을 구성한다. */
export const createCubismBinding = (binding: CubismBinding): PuppetParameterBinding => {
  const {keyforms, parameterIds} = binding
  if (
    binding.interpolation === 'grid' &&
    parameterIds.reduce(
      (count, _, axis) => count * new Set(keyforms.map((form) => form.values[axis])).size,
      1,
    ) !== keyforms.length
  ) {
    throw new Error(`Cubism ${binding.id} keyform grid is incomplete`)
  }
  const common = {
    ...binding,
    sampling: binding.sampling ?? {
      continuousPrecision: 'float64' as const,
      discretePrecision: 'float32' as const,
      keyTolerance: 0.0001,
    },
  }
  switch (parameterIds.length) {
    case 1:
      return {
        ...common,
        keyforms: keyforms.map((form) => ({...form, values: [form.values[0]!]})),
        parameterIds: [parameterIds[0]!],
      }
    case 2:
      return {
        ...common,
        keyforms: keyforms.map((form) => ({...form, values: [form.values[0]!, form.values[1]!]})),
        parameterIds: [parameterIds[0]!, parameterIds[1]!],
      }
    case MAX_PARAMETER_DIMENSIONS:
      return {
        ...common,
        keyforms: keyforms.map((form) => ({
          ...form,
          values: [form.values[0]!, form.values[1]!, form.values[2]!],
        })),
        parameterIds: [parameterIds[0]!, parameterIds[1]!, parameterIds[2]!],
      }
    default:
      throw new Error(`Cubism ${binding.id} uses ${parameterIds.length} parameter dimensions`)
  }
}
