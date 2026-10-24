import {cx} from 'class-variance-authority'

export const MAXIMUM_DRAFT_LENGTH = 1200

export const BUTTON_CLASSES = cx(
  'h-11 rounded-full px-5 text-sm font-700 transition',
  'disabled:cursor-not-allowed disabled:opacity-35',
)
