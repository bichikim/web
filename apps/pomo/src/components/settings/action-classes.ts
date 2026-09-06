import {cva} from 'class-variance-authority'

export const settingsActionClasses = cva(
  'inline-flex box-border flex-none cursor-pointer items-center justify-center gap-[0.35rem] ' +
    'rounded-control border border-solid border-highlight [background-color:transparent] px-3 ' +
    'text-modal-detail font-bold text-foreground no-underline [font:inherit] ' +
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease] ' +
    '[&:hover:not(:disabled)]:bg-secondary-soft ' +
    'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-highlight ' +
    'focus-visible:[outline-offset:0.125rem] disabled:cursor-not-allowed disabled:opacity-55 ' +
    'motion-reduce:transition-none',
  {
    defaultVariants: {size: 'small'},
    variants: {
      size: {
        medium: 'min-h-control-md py-2',
        small: 'min-h-9 py-0',
      },
    },
  },
)
