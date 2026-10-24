import {PSelect, type PSelectOption} from '../p-select/PSelect'
import {
  eventActionIdSchema,
  type EventBindingItem,
  type PDialogue,
} from '../../features/focus-room-dialogue'
import type {DialogueEventActionDefinition} from './event-definitions'
import * as m from '@paraglide/message'

interface DialogueConnectionMenuProps {
  readonly accessibleLabel?: string
  readonly actions?: ReadonlyArray<DialogueEventActionDefinition>
  readonly dialogues: ReadonlyArray<PDialogue>
  readonly disabled: boolean
  readonly getMetadata: (dialogue: PDialogue) => string
  readonly onChange: (items: ReadonlyArray<EventBindingItem>) => void
  readonly selectedItems?: ReadonlyArray<EventBindingItem>
  readonly selectedDialogueIds?: ReadonlyArray<string>
}

const encodeEventBindingItem = (item: EventBindingItem) => `${item.type}:${item.id}`

const decodeEventBindingItem = (value: string): EventBindingItem | null => {
  if (value.startsWith('dialogue:')) {
    const id = value.slice('dialogue:'.length)
    return id.length === 0 ? null : {id, type: 'dialogue'}
  }

  if (!value.startsWith('action:')) {
    return null
  }

  const actionId = eventActionIdSchema.safeParse(value.slice('action:'.length))
  return actionId.success ? {id: actionId.data, type: 'action'} : null
}

export const DialogueConnectionMenu = (props: DialogueConnectionMenuProps) => {
  const selectedItems = () =>
    props.selectedItems ??
    (props.selectedDialogueIds ?? []).map((id): EventBindingItem => ({id, type: 'dialogue'}))
  const options = (): ReadonlyArray<PSelectOption<string>> => [
    ...props.dialogues.map((dialogue) => ({
      description: props.getMetadata(dialogue),
      label: dialogue.text,
      value: encodeEventBindingItem({id: dialogue.id, type: 'dialogue'}),
    })),
    ...(props.actions ?? []).map((action) => ({
      description: action.description,
      icon: action.icon,
      label: action.label,
      value: encodeEventBindingItem({id: action.id, type: 'action'}),
    })),
  ]
  const selectedValues = () => selectedItems().map(encodeEventBindingItem)

  return (
    <PSelect
      accessibleLabel={props.accessibleLabel ?? m.settings_event_binding_connection()}
      appearance="detailed"
      clearLabel={m.settings_event_binding_clear()}
      disabled={props.disabled}
      hideLabel
      label={m.settings_event_binding_connection()}
      multiple
      onChange={(values) => {
        props.onChange(
          values.flatMap((value) => {
            const item = decodeEventBindingItem(value)
            return item === null ? [] : [item]
          }),
        )
      }}
      options={options()}
      placeholder={
        options().length === 0
          ? m.settings_event_binding_empty()
          : m.settings_event_binding_select()
      }
      selectionLabel={(selectedOptions) => {
        return selectedOptions.length === 1
          ? (selectedOptions[0]?.label ?? m.settings_event_binding_select())
          : m.settings_event_binding_selected({count: selectedOptions.length})
      }}
      value={selectedValues()}
    />
  )
}
