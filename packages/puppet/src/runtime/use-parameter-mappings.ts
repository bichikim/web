import type {Accessor} from 'solid-js'
import type {PuppetParameter} from '../player'
import type {MappingValues, ParameterMapping, RuntimeProfile} from '../tracking/types'
interface UseParameterMappingsProps {
  readonly profile: Accessor<RuntimeProfile | undefined>
  readonly updateProfile: (profile: RuntimeProfile) => void
}
export const useParameterMappings = (props: UseParameterMappingsProps) => {
  const updateMappings = (
    transform: (mappings: ReadonlyArray<ParameterMapping>) => ReadonlyArray<ParameterMapping>,
  ) => {
    const current = props.profile()
    if (current !== undefined) {
      props.updateProfile({...current, mappings: transform(current.mappings)})
    }
  }
  return {
    calibrateMappings: (values: MappingValues | null) => {
      if (values !== null) {
        updateMappings((mappings) =>
          mappings.map((mapping) => {
            if (mapping.direct) {
              return mapping
            }
            const baseline = values[mapping.input]
            return baseline !== undefined && Number.isFinite(baseline)
              ? {...mapping, baseline}
              : mapping
          }),
        )
      }
    },
    removeMapping: (id: string) =>
      updateMappings((mappings) => mappings.filter((mapping) => mapping.parameterId !== id)),
    retargetMapping: (id: string, parameter: PuppetParameter) =>
      updateMappings((mappings) =>
        mappings.map((mapping) => {
          if (mapping.parameterId !== id) {
            return mapping
          }
          const reversed = mapping.outputMinimum > mapping.outputMaximum
          return {
            ...mapping,
            outputMaximum: reversed ? parameter.minimum : parameter.maximum,
            outputMinimum: reversed ? parameter.maximum : parameter.minimum,
            parameterId: parameter.id,
          }
        }),
      ),
    updateMapping: (mapping: ParameterMapping) =>
      updateMappings((mappings) =>
        mappings.some((candidate) => candidate.parameterId === mapping.parameterId)
          ? mappings.map((candidate) =>
              candidate.parameterId === mapping.parameterId ? mapping : candidate,
            )
          : [...mappings, mapping],
      ),
  }
}
