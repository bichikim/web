import {cx} from 'class-variance-authority'

export const BUTTON_CLASSES = cx(
  'h-11 rounded-3 border border-#e8bc88/55 bg-#e8bc88 px-5 text-sm font-750 text-#21170f',
  'transition hover:bg-#f2cca1 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88 disabled:cursor-wait disabled:opacity-55',
)
export const SECONDARY_BUTTON_CLASSES = cx(
  'h-10 rounded-3 border border-white/15 bg-white/5 px-4 text-sm font-700 text-white',
  'transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88',
)
export const DANGER_BUTTON_CLASSES = cx(
  'min-h-9 rounded-3 border border-#e78f8f/35 bg-transparent px-3 text-xs font-700',
  'text-#f0aaaa transition hover:bg-#e78f8f/10 focus-visible:outline-2',
  'focus-visible:outline-offset-2 focus-visible:outline-#f0aaaa disabled:cursor-wait disabled:opacity-45',
)
