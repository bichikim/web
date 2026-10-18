import {cx} from 'class-variance-authority'

export const INPUT_CLASSES = cx(
  'box-border min-h-control-md min-w-0 w-full rounded-panel-inner border border-solid border-border',
  'bg-content-surface px-4 text-base text-foreground outline-none',
  'focus-visible:border-highlight focus-visible:shadow-focus',
)
