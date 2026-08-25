import {PSelect, type PSelectOption} from '../PSelect'
import type {PDialogue} from '../../features/focus-room-dialogue/schema'

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
      accessibleLabel={props.accessibleLabel ?? '대화 연결'}
      appearance="detailed"
      clearLabel="모두 연결 해제"
      disabled={props.disabled}
      hideLabel
      label="대화 연결"
      multiple
      onChange={props.onChange}
      options={options()}
      placeholder={props.dialogues.length === 0 ? '대화 없음' : '대화 선택'}
      selectionLabel={(selectedOptions) => {
        return selectedOptions.length === 1
          ? selectedOptions[0]!.label
          : `${selectedOptions.length}개 대화 연결됨`
      }}
      value={props.selectedDialogueIds}
    />
  )
}
