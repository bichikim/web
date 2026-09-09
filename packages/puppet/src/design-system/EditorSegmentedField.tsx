import type {ControlSizeProps} from './control-size'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {For} from 'solid-js'

interface SegmentOption<T extends string> {
  readonly value: T
  readonly disabled?: boolean
  readonly label: string
}
interface EditorSegmentedFieldProps<T extends string> extends ControlSizeProps {
  readonly label: string
  readonly options: ReadonlyArray<SegmentOption<T>>
  readonly value: T
  readonly disabled?: boolean
  readonly onChange?: (value: T) => void
}

export const EditorSegmentedField = <T extends string>(props: EditorSegmentedFieldProps<T>) => (
  <div
    class="editor-control editor-segmented-field"
    data-control-size={props.size ?? 'sm'}
    data-size={props.size ?? 'sm'}
    role="group"
    aria-label={props.label}
  >
    <For each={props.options}>
      {(option) => (
        <ToggleButton
          type="button"
          pressed={props.value === option.value}
          disabled={props.disabled || option.disabled}
          onClick={() => props.onChange?.(option.value)}
        >
          {option.label}
        </ToggleButton>
      )}
    </For>
  </div>
)
