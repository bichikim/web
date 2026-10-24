import {cx} from 'class-variance-authority'

export const BUTTON_CLASSES = cx(
  'inline-flex min-h-10 items-center justify-center rounded-3 border border-white/12 px-3',
  'text-sm font-700 text-#f8edf1 transition hover:border-#f2a7b8/45 hover:bg-white/8',
  'disabled:cursor-not-allowed disabled:opacity-45',
)
