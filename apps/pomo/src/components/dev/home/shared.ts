import {cx} from 'class-variance-authority'

export const CARD_CLASSES = cx(
  'group grid min-h-60 content-between overflow-hidden rounded-7 border border-white/10 p-6',
  'bg-white/4 text-inherit no-underline shadow-[0_24px_70px_rgba(5,2,10,0.28)]',
  'transition hover:-translate-y-1 hover:border-#f2a7b8/35 hover:bg-white/7',
)
