import type {DialogueEventId} from '../../features/focus-room-dialogue'

export interface DialogueEventDefinition {
  readonly description: string
  readonly icon: string
  readonly id: DialogueEventId
  readonly label: string
}

export const DIALOGUE_EVENTS: ReadonlyArray<DialogueEventDefinition> = [
  {
    description: 'Pomofi에 들어올 때 한 번 재생',
    icon: 'i-tabler-door-enter',
    id: 'room-enter',
    label: '입장',
  },
  {
    description: '집중 시간이 시작될 때 재생',
    icon: 'i-tabler-player-play',
    id: 'focus-start',
    label: '포모도르 집중 시작',
  },
  {
    description: '집중 시간이 끝날 때 재생',
    icon: 'i-tabler-player-stop',
    id: 'focus-end',
    label: '포모도르 집중 종료',
  },
  {
    description: '휴식 시간이 시작될 때 재생',
    icon: 'i-tabler-coffee',
    id: 'break-start',
    label: '포모도르 휴식 시작',
  },
  {
    description: '휴식 시간이 끝날 때 재생',
    icon: 'i-tabler-alarm',
    id: 'break-end',
    label: '포모도르 휴식 종료',
  },
  {
    description: '긴 휴식 시간이 시작될 때 재생',
    icon: 'i-tabler-armchair',
    id: 'long-break-start',
    label: '포모도르 긴 휴식 시작',
  },
  {
    description: '긴 휴식 시간이 끝날 때 재생',
    icon: 'i-tabler-clock-stop',
    id: 'long-break-end',
    label: '포모도르 긴 휴식 종료',
  },
  {
    description: '설정한 랜덤 간격마다 재생',
    icon: 'i-tabler-dice-5',
    id: 'random',
    label: '랜덤 이벤트',
  },
]
