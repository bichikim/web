import type {DialogueEventId} from '../../features/focus-room-dialogue'
import * as m from '@paraglide/message'

export interface DialogueEventDefinition {
  readonly description: string
  readonly icon: string
  readonly id: DialogueEventId
  readonly label: string
}

export const getDialogueEvents = (): ReadonlyArray<DialogueEventDefinition> => [
  {
    description: m.settings_event_room_enter_description(),
    icon: 'i-tabler-door-enter',
    id: 'room-enter',
    label: m.settings_event_room_enter(),
  },
  {
    description: m.settings_event_focus_start_description(),
    icon: 'i-tabler-player-play',
    id: 'focus-start',
    label: m.settings_event_focus_start(),
  },
  {
    description: m.settings_event_focus_end_description(),
    icon: 'i-tabler-player-stop',
    id: 'focus-end',
    label: m.settings_event_focus_end(),
  },
  {
    description: m.settings_event_break_start_description(),
    icon: 'i-tabler-coffee',
    id: 'break-start',
    label: m.settings_event_break_start(),
  },
  {
    description: m.settings_event_break_end_description(),
    icon: 'i-tabler-alarm',
    id: 'break-end',
    label: m.settings_event_break_end(),
  },
  {
    description: m.settings_event_long_break_start_description(),
    icon: 'i-tabler-armchair',
    id: 'long-break-start',
    label: m.settings_event_long_break_start(),
  },
  {
    description: m.settings_event_long_break_end_description(),
    icon: 'i-tabler-clock-stop',
    id: 'long-break-end',
    label: m.settings_event_long_break_end(),
  },
  {
    description: m.settings_event_random_description(),
    icon: 'i-tabler-dice-5',
    id: 'random',
    label: m.settings_event_random(),
  },
]
