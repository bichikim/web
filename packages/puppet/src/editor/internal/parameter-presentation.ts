import type {PuppetParameterValueMap, PuppetParameterValues} from '../../deformation'
import type {PuppetDocument, PuppetParameter, PuppetParameterBinding} from '../../player/document'

export interface ParameterPresentation {
  readonly bindings: ReadonlyArray<PuppetParameterBinding>
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly previewBindingIds: ReadonlySet<string>
  projectValues(bindingId: string, values: PuppetParameterValues): PuppetParameterValues | undefined
  expandValues(
    bindingId: string,
    values: PuppetParameterValues,
    current: PuppetParameterValueMap,
  ): PuppetParameterValues | undefined
}

/** Returns the manually controlled axes without changing the document's parameter definitions. */
export const getVisibleParameters = (document: PuppetDocument): ReadonlyArray<PuppetParameter> => {
  const outputs = new Set(document.physics?.pendulums.map((pendulum) => pendulum.outputParameterId))
  return (document.parameters ?? []).filter((parameter) => !outputs.has(parameter.id))
}

/** Projects mixed bindings to input-only preview controls while retaining their original coordinates. */
export const getParameterPresentation = (
  document: PuppetDocument,
  sourceBindings: ReadonlyArray<PuppetParameterBinding>,
): ParameterPresentation => {
  const parameters = getVisibleParameters(document)
  const visibleIds = new Set(parameters.map((parameter) => parameter.id))
  const parameterById = new Map(document.parameters?.map((parameter) => [parameter.id, parameter]))
  const sourceById = new Map(sourceBindings.map((binding) => [binding.id, binding]))
  const previewBindingIds = new Set<string>()
  const bindings = sourceBindings.flatMap<PuppetParameterBinding>((binding) => {
    const ids = binding.parameterIds.filter((id) => visibleIds.has(id))
    if (ids.length === binding.parameterIds.length) {
      return [binding]
    }
    if (ids.length !== 1) {
      return []
    }
    previewBindingIds.add(binding.id)
    // A projected input has no editable keyforms: each point spans an internal physics axis.
    return [{...binding, keyforms: [], parameterIds: [ids[0]!]}]
  })
  const displayById = new Map(bindings.map((binding) => [binding.id, binding]))
  return {
    bindings,
    expandValues(bindingId, values, current) {
      const source = sourceById.get(bindingId)
      const display = displayById.get(bindingId)
      if (source === undefined || display === undefined) {
        return undefined
      }
      return source.parameterIds.map((id) => {
        const index = display.parameterIds.indexOf(id)
        return index < 0
          ? (current[id] ?? parameterById.get(id)?.defaultValue ?? 0)
          : (values[index] ?? parameterById.get(id)?.defaultValue ?? 0)
      }) as unknown as PuppetParameterValues
    },
    parameters,
    previewBindingIds,
    projectValues(bindingId, values) {
      const source = sourceById.get(bindingId)
      const display = displayById.get(bindingId)
      if (source === undefined || display === undefined) {
        return undefined
      }
      return display.parameterIds.map(
        (id) => values[source.parameterIds.indexOf(id)] ?? parameterById.get(id)?.defaultValue ?? 0,
      ) as unknown as PuppetParameterValues
    },
  }
}
