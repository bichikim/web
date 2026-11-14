import type {PuppetParameter} from '@winter-love/puppet/player'
import type {ParameterGroup, ParameterMapping} from '../../tracking/types'
interface GetParameterPortsOptions {
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly mappings: ReadonlyArray<ParameterMapping>
  readonly groups: ReadonlyArray<ParameterGroup>
  readonly extraPorts: ReadonlyArray<string>
  readonly hiddenIds: ReadonlyArray<string>
}
export const getParameterPorts = (options: GetParameterPortsOptions) => {
  const parameters = options.parameters.filter(
    (parameter) =>
      !options.hiddenIds.includes(`parameter:${parameter.id}`) &&
      (options.mappings.some((mapping) => mapping.parameterId === parameter.id) ||
        options.extraPorts.includes(parameter.id) ||
        options.groups.some((group) => group.parameterIds.includes(parameter.id))),
  )
  return {
    options: [
      '__add__',
      ...options.parameters
        .filter((parameter) => !parameters.some((output) => output.id === parameter.id))
        .map((parameter) => parameter.id),
    ],
    parameters,
  }
}
