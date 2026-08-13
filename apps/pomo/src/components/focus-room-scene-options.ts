export const FOCUS_ROOM_TIME_OPTIONS = [
  {icon: 'i-tabler-sun', label: '낮', value: 'day'},
  {icon: 'i-tabler-moon', label: '밤', value: 'night'},
  {icon: 'i-tabler-sun-moon', label: '자동', value: 'auto'},
] as const

export const FOCUS_ROOM_ACTIVITY_OPTIONS = [
  {icon: 'i-tabler-book-2', label: '책 읽기', value: 'reading'},
  {icon: 'i-tabler-pencil', label: '글쓰기', value: 'writing'},
  {icon: 'i-tabler-keyboard', label: '노트북 타이핑', value: 'typing'},
] as const

export const FOCUS_ROOM_GAZE_OPTIONS = [
  {icon: 'i-tabler-focus-2', label: '작업에 집중', value: 'focused'},
  {icon: 'i-tabler-user-scan', label: '사용자 보기', value: 'user'},
] as const

export type FocusRoomActivity = (typeof FOCUS_ROOM_ACTIVITY_OPTIONS)[number]['value']
export type FocusRoomGaze = (typeof FOCUS_ROOM_GAZE_OPTIONS)[number]['value']
