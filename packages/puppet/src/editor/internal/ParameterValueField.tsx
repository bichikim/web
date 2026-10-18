import {Show} from 'solid-js'
import {EditorNumberField, EditorSelect} from '../../design-system'
import type {PuppetParameter} from '../../player/document'
import {resolveParameterValue} from '../../player/parameter-value'

interface ParameterValueFieldProps {
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onValueChange?: (value: number) => void
  readonly parameter: PuppetParameter
  readonly value?: number
}

export const ParameterValueField = (props: ParameterValueFieldProps) => (
  <Show
    when={props.parameter.options}
    fallback={
      <EditorNumberField
        label={`${props.parameter.name} 값`}
        maximum={props.parameter.maximum}
        minimum={props.parameter.minimum}
        value={props.value ?? props.parameter.defaultValue}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onValueChange={props.onValueChange}
      />
    }
  >
    {(options) => (
      <EditorSelect
        label={`${props.parameter.name} 값`}
        options={options().map((option) => String(option.value))}
        optionLabel={(value) =>
          options().find((option) => option.value === Number(value))?.label ?? value
        }
        value={String(resolveParameterValue(props.parameter, props.value))}
        onChange={(value) => props.onValueChange?.(Number(value))}
      />
    )}
  </Show>
)
