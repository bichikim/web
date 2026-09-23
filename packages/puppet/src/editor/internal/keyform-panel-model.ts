import type {PuppetParameterValues} from '../../deformation'
import type {PuppetParameterBinding} from '../../player/document'
import type {EditorKeyformPanelProps} from './editor-keyform-panel-props'

export const createKeyformPanelModel = (props: EditorKeyformPanelProps) => {
  const activeBinding = () => props.bindings.find((binding) => binding.id === props.activeBindingId)
  const activePreview = () => props.previewBindingIds?.has(props.activeBindingId ?? '') === true
  const parameterById = () =>
    new Map(props.parameters.map((parameter) => [parameter.id, parameter]))
  const bindingParameters = (binding: PuppetParameterBinding) =>
    binding.parameterIds.flatMap((parameterId) => {
      const parameter = parameterById().get(parameterId)
      return parameter === undefined ? [] : [parameter]
    })
  const bindingValues = (binding: PuppetParameterBinding): PuppetParameterValues =>
    binding.id === props.activeBindingId && props.values !== undefined
      ? props.values
      : (bindingParameters(binding).map(
          (parameter) => props.parameterValueMap?.[parameter.id] ?? parameter.defaultValue,
        ) as unknown as PuppetParameterValues)

  return {activeBinding, activePreview, bindingParameters, bindingValues}
}
