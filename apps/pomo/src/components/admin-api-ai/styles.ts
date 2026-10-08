import {cx} from 'class-variance-authority'

export const BUTTON_CLASSES = cx(
  'min-h-11 rounded-2 border border-white/20 bg-white/5 px-3 py-2 text-sm text-white',
  'hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88 disabled:opacity-45',
)
export const INPUT_CLASSES = cx(
  'min-h-11 min-w-0 w-full rounded-2 border border-white/30 bg-#211c17 px-3 py-2 text-sm text-white',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-#e8bc88',
)
