import {cx} from 'class-variance-authority'

export const PAGE_CLASSES = cx(
  'grid min-h-dvh place-items-center bg-#15120f px-5 py-12 text-#fffaf1',
  'bg-[radial-gradient(circle_at_50%_0%,#453a30_0%,#211b16_42%,#15120f_78%)]',
)

export const FIELD_CLASSES = cx(
  'h-12 w-full rounded-3 border border-white/15 bg-black/20 px-4 text-base text-white',
  'outline-none transition placeholder:text-white/35 focus:border-#e8bc88 focus:ring-2',
  'focus:ring-#e8bc88/25',
)

export const PRIMARY_BUTTON_CLASSES = cx(
  'mt-2 h-12 w-full rounded-3 border-0 bg-#e8bc88 text-sm font-800 text-#22170e',
  'transition hover:bg-#f4cea0 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#f4cea0 disabled:cursor-wait disabled:opacity-55',
)

export const SECONDARY_BUTTON_CLASSES = cx(
  'h-11 w-full border-0 bg-transparent px-3 text-sm font-650 text-white/65',
  'transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-#e8bc88 disabled:cursor-wait disabled:opacity-55',
)

export const ERROR_MESSAGE_CLASSES =
  'm-0 rounded-3 bg-#b84747/18 px-4 py-3 text-sm leading-6 text-#ffc6c6'

export const SUCCESS_MESSAGE_CLASSES =
  'm-0 rounded-3 bg-#4d9b73/18 px-4 py-3 text-sm leading-6 text-#bff5d5'
