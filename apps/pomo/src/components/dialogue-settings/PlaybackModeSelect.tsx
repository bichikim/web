import {PSelect, type PSelectOption} from '../PSelect'
import type {DialogueEventPlaybackMode} from '../../features/focus-room-dialogue'
import * as m from '@paraglide/message'
import {DialogueEventSettingRow} from './EventSettingRow'

const getPlaybackModeOptions = (): ReadonlyArray<PSelectOption<DialogueEventPlaybackMode>> => [
  {label: m.settings_event_playback_sequential_all(), value: 'sequential-all'},
  {label: m.settings_event_playback_random_all(), value: 'random-all'},
  {label: m.settings_event_playback_random_one(), value: 'random-one'},
]

const getPlaybackModeDescription = (mode: DialogueEventPlaybackMode): string => {
  switch (mode) {
    case 'random-all':
      return m.settings_event_playback_random_all_description()
    case 'random-one':
      return m.settings_event_playback_random_one_description()
    case 'sequential-all':
      return m.settings_event_playback_sequential_all_description()
  }
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
      description={getPlaybackModeDescription(playbackMode())}
      label={m.settings_event_playback_mode()}
    >
      <PSelect
        accessibleLabel={m.settings_event_playback_mode_label({
          event: props.eventLabel ?? m.settings_events_title(),
        })}
        hideLabel
        label={m.settings_event_playback_mode()}
        onChange={(nextMode) => props.onChange?.(nextMode)}
        options={getPlaybackModeOptions()}
        value={playbackMode()}
      />
    </DialogueEventSettingRow>
  )
}
