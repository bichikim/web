import type {ParameterGroup, ParameterMapping} from '../../tracking/types'
interface DisconnectGroupMappingsOptions {
  readonly group: ParameterGroup
  readonly mappings: ReadonlyArray<ParameterMapping>
}
export const disconnectGroupMappings = (options: DisconnectGroupMappingsOptions) =>
  options.mappings.filter(
    (mapping) =>
      mapping.parameterId !== `group:${options.group.id}` &&
      !options.group.parameterIds.includes(mapping.parameterId),
  )
