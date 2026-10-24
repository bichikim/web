import {Show} from 'solid-js'

import {EditorNumberField, EditorSelect} from '../../design-system'
import type {PuppetParameter} from '../../player/document'
import {resolveParameterValue} from '../../player/parameter-value'

interface TimelineParameterValueFieldProps {
  readonly disabled?: boolean
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onValueChange?: (value: number) => void
  readonly parameter: PuppetParameter
  readonly value?: number
}

export const TimelineParameterValueField = (props: TimelineParameterValueFieldProps) => (
  <Show
    when={props.parameter.options}
    fallback={
      <EditorNumberField
        disabled={props.disabled}
        label={`${props.parameter.name} 현재 값`}
        maximum={props.parameter.maximum}
        minimum={props.parameter.minimum}
        step="any"
        value={props.value ?? props.parameter.defaultValue}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onValueChange={props.onValueChange}
      />
    }
  >
    {(options) => (
      <EditorSelect
        disabled={props.disabled}
        label={`${props.parameter.name} 현재 값`}
        options={options().map((option) => String(option.value))}
        optionLabel={(value) =>
          options().find((option) => option.value === Number(value))?.label ?? value
        }
        value={String(resolveParameterValue(props.parameter, props.value))}
        onChange={(value) => {
          props.onEditStart?.()
          props.onValueChange?.(Number(value))
          props.onEditEnd?.()
        }}
      />
    )}
  </Show>
)
