import type {PuppetParameterValues} from '../../../../deformation'
import {
  addParameter,
  type AddParameterOptions,
  type AddParameterResult,
  addThreeDimensionalParameter,
  addTwoDimensionalParameter,
  insertParameterKeyform,
} from '../../parameter-keyforms'

const MINIMUM = -30
const MAXIMUM = 30
const GRID_VALUES = [MINIMUM, 0, MAXIMUM] as const

/** 키폼 편집 테스트에 필요한 좌표를 명시적으로 채운다. */
const populate = (added: AddParameterResult | undefined): AddParameterResult | undefined => {
  if (added === undefined) {
    return undefined
  }
  const dimensions = added.binding.parameterIds.length
  const coordinates = Array.from({length: dimensions}).reduce<ReadonlyArray<ReadonlyArray<number>>>(
    (points) =>
      points.flatMap((point) =>
        (dimensions === 1 ? [0] : GRID_VALUES).map((value) => [...point, value]),
      ),
    [[]],
  )
  const document = coordinates.reduce(
    (current, values) =>
      insertParameterKeyform({
        bindingId: added.binding.id,
        document: current,
        values: values as PuppetParameterValues,
      })!,
    added.document,
  )
  return {
    binding: document.parameterBindings!.find((binding) => binding.id === added.binding.id)!,
    document,
  }
}

export const createKeyedParameter = (options: AddParameterOptions) =>
  populate(addParameter(options))
export const createKeyedParameter2D = (options: AddParameterOptions) =>
  populate(addTwoDimensionalParameter(options))
export const createKeyedParameter3D = (options: AddParameterOptions) =>
  populate(addThreeDimensionalParameter(options))
