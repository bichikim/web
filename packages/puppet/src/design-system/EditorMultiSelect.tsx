import {Select} from '@kobalte/core/select'
import {untrack} from 'solid-js'
import type {ControlSizeProps} from './control-size'
import {useEditorPortalMount} from './EditorPortalProvider'

interface EditorMultiSelectProps extends ControlSizeProps {
  readonly label: string
  readonly options: ReadonlyArray<string>
  readonly optionLabel?: (value: string) => string
  readonly values?: ReadonlyArray<string>
  readonly disabled?: boolean
  readonly onChange?: (values: ReadonlyArray<string>) => void
}

export const EditorMultiSelect = (props: EditorMultiSelectProps) => {
  const mount = useEditorPortalMount()
  return (
    <Select<string>
      multiple
      closeOnSelection={false}
      options={[...props.options]}
      optionTextValue={props.optionLabel}
      value={[...(props.values ?? [])]}
      disabled={props.disabled}
      onChange={(values) => untrack(() => props.onChange?.(values))}
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
      <Select.Trigger
        aria-label={props.label}
        class="editor-control editor-select-trigger"
        data-control-size={props.size ?? 'sm'}
      >
        <Select.Value<string>>
          {(state) =>
            state.selectedOptions().length === 0
              ? props.label
              : `${props.label} · ${state.selectedOptions().length}`
          }
        </Select.Value>
        <Select.Icon>
          <span aria-hidden="true" class="puppet-icon puppet-icon-chevron-down" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal mount={mount}>
        <Select.Content class="editor-context-menu-content editor-select-content">
          <Select.Listbox class="editor-select-list" />
        </Select.Content>
      </Select.Portal>
    </Select>
  )
}
