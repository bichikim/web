import {cx} from 'class-variance-authority'

const CIRCLE_BORDER_PATH = cx(
  'M 50 3',
  'C 76 1 98 22 97 50',
  'C 99 76 78 98 49 97',
  'C 22 99 1 77 3 49',
  'C 1 23 23 3 50 3 Z',
)

const CIRCLE_ACCENT_PATH = cx(
  'M 19 14 C 34 3 58 1 76 10',
  'M 91 24 C 101 43 98 67 87 82',
  'M 72 94 C 50 101 27 95 14 79',
  'M 6 65 C 0 43 6 25 20 13',
)

export const CIRCLE_PATHS = {
  accent: CIRCLE_ACCENT_PATH,
  border: CIRCLE_BORDER_PATH,
} as const
