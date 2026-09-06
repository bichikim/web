import type {PButtonProps} from './PButton'

export const GLASS_ICON_BUTTON = {
  backdropBlur: true,
  bordered: true,
  class:
    'overflow-hidden data-[icon-only]:enabled:hover:bg-surface-interactive ' +
    'focus-visible:border-highlight focus-visible:bg-surface-interactive ' +
    'ui-expanded:border-highlight ui-expanded:bg-surface-interactive',
  focusOutline: true,
  iconClass: 'size-6 text-highlight',
  tone: 'glass',
  transparent: true,
} as const satisfies PButtonProps
