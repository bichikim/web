import {createMemo} from 'solid-js'
import {getParameterIndex} from '../../player/parameter-index'
import {isParameterTuple, mapParameterTuple, type PuppetParameterValues} from '../../deformation'
import type {PuppetParameterBinding} from '../../player/document'
import type {EditorKeyformPanelProps} from './editor-keyform-panel-props'

export const createKeyformPanelModel = (props: EditorKeyformPanelProps) => {
  const activeBinding = () => props.bindings.find((binding) => binding.id === props.activeBindingId)
  const activePreview = () => props.previewBindingIds?.has(props.activeBindingId ?? '') === true
  const parameterById = createMemo(() => getParameterIndex(props.parameters))
  const bindingParameters = (binding: PuppetParameterBinding) =>
    binding.parameterIds.flatMap((parameterId) => {
      const parameter = parameterById().get(parameterId)
      return parameter === undefined ? [] : [parameter]
    })
  const bindingValues = (binding: PuppetParameterBinding): PuppetParameterValues | undefined => {
    const parameters = bindingParameters(binding)
    if (!isParameterTuple(parameters) || parameters.length !== binding.parameterIds.length) {
      return undefined
    }
    const values = binding.id === props.activeBindingId ? props.values : undefined
    if (values !== undefined) {
      return values.length === parameters.length ? values : undefined
    }
    return mapParameterTuple(
      parameters,
      (parameter) => props.parameterValueMap?.[parameter.id] ?? parameter.defaultValue,
    )
  }

  return {activeBinding, activePreview, bindingParameters, bindingValues}
}
