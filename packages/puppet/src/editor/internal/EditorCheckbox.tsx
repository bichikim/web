import {Checkbox} from '@kobalte/core/checkbox'
interface EditorCheckboxProps {
  readonly checked?: boolean
  readonly disabled?: boolean
  readonly label?: string
  readonly onChange?: (checked: boolean) => void
}
export const EditorCheckbox = (props: EditorCheckboxProps) => (
  <Checkbox
    as="span"
    checked={props.checked}
    disabled={props.disabled}
    onChange={(checked) => props.onChange?.(checked)}
    class="editor-checkbox"
  >
    <Checkbox.Input aria-label={props.label} />
    <Checkbox.Control class="editor-checkbox-control">
      <Checkbox.Indicator>
        <span aria-hidden="true" class="puppet-icon puppet-icon-check" />
      </Checkbox.Indicator>
    </Checkbox.Control>
  </Checkbox>
)
