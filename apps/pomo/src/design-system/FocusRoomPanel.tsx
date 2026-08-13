import {cva, type VariantProps} from 'class-variance-authority'
import type {JSX} from 'solid-js'

const panelStyles = cva(
  ['text-[var(--focus-room-text)]', 'focus-room-backdrop shadow-[var(--focus-room-shadow)]'],
  {
    defaultVariants: {
      padding: 'medium',
      tone: 'glass',
    },
    variants: {
      padding: {
        compact: 'p-[var(--focus-room-padding-sm)]',
        medium: 'p-[var(--focus-room-padding-md)]',
        spacious: 'p-[var(--focus-room-padding-xl)]',
      },
      tone: {
        glass: 'bg-[var(--focus-room-surface)]',
        strong: 'bg-[var(--focus-room-surface-strong)]',
      },
    },
  },
)

export interface FocusRoomPanelProps extends VariantProps<typeof panelStyles> {
  readonly children: JSX.Element
  readonly class?: string
}

export const FocusRoomPanel = (props: FocusRoomPanelProps) => (
  <div class={panelStyles({class: props.class, padding: props.padding, tone: props.tone})}>
    {props.children}
  </div>
)
