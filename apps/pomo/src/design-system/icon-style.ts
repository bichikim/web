import type {PSceneStyle} from '../features/focus-room-animation'

const SCRIBBLE_ICON_CLASSES: Readonly<Record<string, string>> = {
  'i-tabler-armchair-2': 'i-pomo-scribble:armchair',
  'i-tabler-arrows-shuffle': 'i-pomo-scribble:shuffle',
  'i-tabler-book-2': 'i-pomo-scribble:book',
  'i-tabler-check': 'i-pomo-scribble:check',
  'i-tabler-chevron-down': 'i-pomo-scribble:chevron-down',
  'i-tabler-chevron-up': 'i-pomo-scribble:chevron-up',
  'i-tabler-coffee': 'i-pomo-scribble:coffee',
  'i-tabler-focus-2': 'i-pomo-scribble:focus',
  'i-tabler-keyboard': 'i-pomo-scribble:keyboard',
  'i-tabler-moon': 'i-pomo-scribble:moon',
  'i-tabler-pencil': 'i-pomo-scribble:pencil',
  'i-tabler-player-pause': 'i-pomo-scribble:pause',
  'i-tabler-player-play': 'i-pomo-scribble:play',
  'i-tabler-player-track-next': 'i-pomo-scribble:track-next',
  'i-tabler-player-track-prev': 'i-pomo-scribble:track-previous',
  'i-tabler-refresh': 'i-pomo-scribble:refresh',
  'i-tabler-repeat': 'i-pomo-scribble:repeat',
  'i-tabler-repeat-once': 'i-pomo-scribble:repeat-once',
  'i-tabler-settings': 'i-pomo-scribble:settings',
  'i-tabler-square': 'i-pomo-scribble:stop',
  'i-tabler-sun': 'i-pomo-scribble:sun',
  'i-tabler-sun-moon': 'i-pomo-scribble:sun-moon',
  'i-tabler-user-scan': 'i-pomo-scribble:user-scan',
  'i-tabler-volume': 'i-pomo-scribble:volume-high',
  'i-tabler-volume-2': 'i-pomo-scribble:volume-medium',
  'i-tabler-volume-4': 'i-pomo-scribble:volume-low',
  'i-tabler-volume-off': 'i-pomo-scribble:volume-off',
}

export const getPomoIconClass = (icon: string, sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? (SCRIBBLE_ICON_CLASSES[icon] ?? icon) : icon
