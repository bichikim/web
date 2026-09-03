import {PSelect, type PSelectOption} from '../PSelect'
import type {PDialogue} from '../../features/focus-room-dialogue/schema'
import * as m from '@paraglide/message'

interface DialogueConnectionMenuProps {
  readonly accessibleLabel?: string
  readonly dialogues: ReadonlyArray<PDialogue>
  readonly disabled: boolean
  readonly getMetadata: (dialogue: PDialogue) => string
  readonly onChange: (dialogueIds: ReadonlyArray<string>) => void
  readonly selectedDialogueIds: ReadonlyArray<string>
}

export const DialogueConnectionMenu = (props: DialogueConnectionMenuProps) => {
  const options = (): ReadonlyArray<PSelectOption<string>> =>
    props.dialogues.map((dialogue) => ({
      description: props.getMetadata(dialogue),
      label: dialogue.text,
      value: dialogue.id,
    }))

  return (
    <PSelect
      accessibleLabel={props.accessibleLabel ?? m.settings_event_dialogue_connection()}
      appearance="detailed"
      clearLabel={m.settings_event_dialogue_clear()}
      disabled={props.disabled}
      hideLabel
      label={m.settings_event_dialogue_connection()}
      multiple
      onChange={props.onChange}
      options={options()}
      placeholder={
        props.dialogues.length === 0
          ? m.settings_event_dialogue_empty()
          : m.settings_event_dialogue_select()
      }
      selectionLabel={(selectedOptions) => {
        return selectedOptions.length === 1
          ? (selectedOptions[0]?.label ?? m.settings_event_dialogue_select())
          : m.settings_event_dialogue_selected({count: selectedOptions.length})
      }}
      value={props.selectedDialogueIds}
    />
  )
}
