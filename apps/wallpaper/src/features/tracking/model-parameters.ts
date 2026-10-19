import type {PuppetParameterBinding} from '@winter-love/puppet/player'
import type {TrackingParameter} from './types'

interface ModelParametersOptions {
  readonly parameters?: readonly TrackingParameter[]
  readonly parameterBindings?: readonly PuppetParameterBinding[]
}
const DIRECTION_THRESHOLD = 0.001
const meanY = (vertices: readonly number[]) =>
  vertices.reduce((sum, coordinate, index) => sum + (index % 2 === 1 ? coordinate : 0), 0) /
  (vertices.length / 2)

const verticalDelta = (
  binding: PuppetParameterBinding,
  parameter: TrackingParameter,
  parameters: readonly TrackingParameter[],
): number => {
  const axis = binding.parameterIds.indexOf(parameter.id)
  if (axis < 0) {
    return 0
  }
  const keyforms = binding.keyforms
    .filter((keyform) =>
      binding.parameterIds.every(
        (id, index) =>
          index === axis ||
          keyform.values[index] ===
            parameters.find((candidate) => candidate.id === id)?.defaultValue,
      ),
    )
    .toSorted((first, second) => first.values[axis]! - second.values[axis]!)
  const first = keyforms.at(0)
  const last = keyforms.at(-1)
  if (first === undefined || last === undefined || first.values[axis] === last.values[axis]) {
    return 0
  }
  return first.parts.reduce((sum, part) => {
    const other = last.parts.find((candidate) => candidate.partId === part.partId)
    return other === undefined || part.vertices.length === 0 || other.vertices.length === 0
      ? sum
      : sum + meanY(other.vertices) - meanY(part.vertices)
  }, 0)
}

/** Adds the model's observed vertical vertex direction when keyforms establish it. */
export const modelParameters = (options: ModelParametersOptions): readonly TrackingParameter[] => {
  const parameters = options.parameters ?? []
  return parameters.map((parameter) => {
    const delta = (options.parameterBindings ?? []).reduce(
      (sum, binding) => sum + verticalDelta(binding, parameter, parameters),
      0,
    )
    return Math.abs(delta) < DIRECTION_THRESHOLD
      ? parameter
      : {...parameter, positiveY: delta > 0 ? ('down' as const) : ('up' as const)}
  })
}
