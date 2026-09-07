import {cx} from 'class-variance-authority'

export const BUTTON_CLASSES = cx(
  'h-11 rounded-3 border border-#e8bc88/55 bg-#e8bc88 px-5 text-sm font-750 text-#21170f',
  'transition hover:bg-#f2cca1 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88 disabled:cursor-wait disabled:opacity-55',
)
