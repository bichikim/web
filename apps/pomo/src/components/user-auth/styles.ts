import {cx} from 'class-variance-authority'

export const ACCOUNT_PAGE_CLASSES = cx(
  'grid min-h-dvh place-items-center px-5 py-12 text-foreground',
  '[background:var(--pomo-editor-background)]',
)

export const ACCOUNT_CARD_CLASSES =
  'w-full max-w-105 rounded-5 border border-border bg-surface p-6 shadow-panel backdrop-blur-surface'
