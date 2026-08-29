import {cva, type VariantProps} from 'class-variance-authority'
import type {JSX} from 'solid-js'

const panelStyles = cva(
  ['text-foreground', 'border border-solid border-border backdrop-blur-surface shadow-panel'],
  {
    defaultVariants: {
      padding: 'medium',
      tone: 'glass',
    },
    variants: {
      padding: {
        compact: 'p-2',
        medium: 'p-3',
        spacious: 'p-5',
      },
      tone: {
        glass: 'bg-surface',
        strong: 'bg-surface-strong',
      },
    },
  },
)

export interface PPanelProps extends VariantProps<typeof panelStyles> {
  readonly children: JSX.Element
  readonly class?: string
}

export const PPanel = (props: PPanelProps) => (
  <div class={panelStyles({class: props.class, padding: props.padding, tone: props.tone})}>
    {props.children}
  </div>
)
