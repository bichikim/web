import {cva, type VariantProps} from 'class-variance-authority'
import type {JSX} from 'solid-js'

const panelStyles = cva(['text-[var(--pomo-text)]', 'pomo-backdrop shadow-[var(--pomo-shadow)]'], {
  defaultVariants: {
    padding: 'medium',
    tone: 'glass',
  },
  variants: {
    padding: {
      compact: 'p-[var(--pomo-padding-sm)]',
      medium: 'p-[var(--pomo-padding-md)]',
      spacious: 'p-[var(--pomo-padding-xl)]',
    },
    tone: {
      glass: 'bg-[var(--pomo-surface)]',
      strong: 'bg-[var(--pomo-surface-strong)]',
    },
  },
})

export interface PPanelProps extends VariantProps<typeof panelStyles> {
  readonly children: JSX.Element
  readonly class?: string
}

export const PPanel = (props: PPanelProps) => (
  <div class={panelStyles({class: props.class, padding: props.padding, tone: props.tone})}>
    {props.children}
  </div>
)
