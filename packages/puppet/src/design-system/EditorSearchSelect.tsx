import {Combobox} from '@kobalte/core/combobox'
import type {ControlSizeProps} from './control-size'
import {useEditorPortalMount} from './EditorPortalProvider'
export interface EditorSearchOption {
  readonly value: string
  readonly label: string
}
interface EditorSearchSelectProps extends ControlSizeProps {
  readonly label: string
  readonly options: readonly EditorSearchOption[]
  readonly value?: EditorSearchOption | null
  readonly placeholder?: string
  readonly triggerLabel?: string
  readonly disabled?: boolean
  readonly onChange?: (value: EditorSearchOption | null) => void
}
export const EditorSearchSelect = (props: EditorSearchSelectProps) => {
  const mount = useEditorPortalMount()
  return (
    <Combobox<EditorSearchOption>
      options={[...props.options]}
      optionValue="value"
      optionLabel="label"
      optionTextValue="label"
      defaultFilter="contains"
      triggerMode="focus"
      value={props.value ?? null}
      disabled={props.disabled}
      onChange={(value) => props.onChange?.(value)}
      itemComponent={(item) => (
        <Combobox.Item
          item={item.item}
          class="editor-context-menu-item"
          onMouseDown={(event) => event.preventDefault()}
        >
          <Combobox.ItemLabel>{item.item.rawValue.label}</Combobox.ItemLabel>
        </Combobox.Item>
      )}
    >
      <Combobox.Control
        class="editor-control editor-select-trigger editor-search-select"
        data-control-size={props.size ?? 'sm'}
      >
        <Combobox.Input
          aria-label={props.label}
          placeholder={props.placeholder ?? props.label}
          class="editor-search-select-input"
        />
        <Combobox.Trigger
          aria-label={props.triggerLabel ?? `${props.label} 목록 열기`}
          class="editor-search-select-trigger"
        >
          <span class="puppet-icon puppet-icon-chevron-down" aria-hidden="true" />
        </Combobox.Trigger>
      </Combobox.Control>
      <Combobox.Portal mount={mount}>
        <Combobox.Content class="editor-context-menu-content editor-select-content">
          <Combobox.Listbox class="editor-select-list" />
        </Combobox.Content>
      </Combobox.Portal>
    </Combobox>
  )
}
