import {untrack} from 'solid-js'
import {Select} from '@kobalte/core/select'
import {useEditorPortalMount} from './EditorPortalProvider'
interface EditorSelectProps {
  readonly label: string
  readonly optionLabel?: (value: string) => string
  readonly options: readonly string[]
  readonly value?: string
  readonly disabled?: boolean
  readonly onChange?: (value: string) => void
}
export const EditorSelect = (props: EditorSelectProps) => {
  const mount = useEditorPortalMount()
  return (
    <Select
      options={[...props.options]}
      optionTextValue={props.optionLabel}
      value={props.value}
      disabled={props.disabled}
      onChange={(value) => {
        untrack(() => {
          if (value !== null && value !== props.value) {
            props.onChange?.(value)
          }
        })
      }}
      itemComponent={(item) => (
        <Select.Item item={item.item} class="editor-context-menu-item">
          <Select.ItemLabel>
            {props.optionLabel?.(item.item.rawValue) ?? item.item.rawValue}
          </Select.ItemLabel>
          <Select.ItemIndicator>
            <span aria-hidden="true" class="puppet-icon puppet-icon-check" />
          </Select.ItemIndicator>
        </Select.Item>
      )}
    >
      <Select.Trigger aria-label={props.label} class="editor-select-trigger">
        <Select.Value<string>>
          {(state) => props.optionLabel?.(state.selectedOption()) ?? state.selectedOption()}
        </Select.Value>
        <Select.Icon>
          <span aria-hidden="true" class="puppet-icon puppet-icon-chevron-down" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal mount={mount}>
        <Select.Content class="editor-context-menu-content">
          <Select.Listbox class="editor-select-list" />
        </Select.Content>
      </Select.Portal>
    </Select>
  )
}
