import {PSelect, type PSelectOption} from '../design-system/PSelect'
import type {DialogueEventPlaybackMode} from '../features/focus-room-dialogue'
import {DialogueEventSettingRow} from './DialogueEventSettingRow'

const PLAYBACK_MODE_OPTIONS: ReadonlyArray<PSelectOption<DialogueEventPlaybackMode>> = [
  {label: '순차 모두 재생', value: 'sequential-all'},
  {label: '랜덤 모두 재생', value: 'random-all'},
  {label: '랜덤 1개 재생', value: 'random-one'},
]

const PLAYBACK_MODE_DESCRIPTIONS: Readonly<Record<DialogueEventPlaybackMode, string>> = {
  'random-all': '이벤트가 발생할 때마다 모든 대화의 순서를 섞어요.',
  'random-one': '이벤트가 발생할 때마다 연결된 대화 중 하나만 골라요.',
  'sequential-all': '연결한 순서대로 모든 대화를 재생해요.',
}

export interface DialoguePlaybackModeSelectProps {
  readonly eventLabel?: string
  readonly onChange?: (playbackMode: DialogueEventPlaybackMode) => void
  readonly value?: DialogueEventPlaybackMode
}

export const DialoguePlaybackModeSelect = (props: DialoguePlaybackModeSelectProps) => {
  const playbackMode = () => props.value ?? 'sequential-all'

  return (
    <DialogueEventSettingRow
      description={PLAYBACK_MODE_DESCRIPTIONS[playbackMode()]}
      label="재생 방식"
    >
      <PSelect
        accessibleLabel={`${props.eventLabel ?? '이벤트'} 재생 방식`}
        hideLabel
        label="재생 방식"
        onChange={(nextMode) => props.onChange?.(nextMode)}
        options={PLAYBACK_MODE_OPTIONS}
        value={playbackMode()}
      />
    </DialogueEventSettingRow>
  )
}
