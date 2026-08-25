import {cva, type VariantProps} from 'class-variance-authority'
import type {JSX} from 'solid-js'

const tagClasses = cva(
  'inline-flex box-border items-center whitespace-nowrap rounded-full border border-solid font-[650] leading-none',
  {
    defaultVariants: {
      size: 'small',
      tone: 'neutral',
    },
    variants: {
      size: {
        medium: 'px-2.5 py-1 text-xs',
        small: 'px-1.5 py-0.5 text-[0.625rem]',
      },
      tone: {
        danger: 'border-danger/35 bg-danger/10 text-danger',
        highlight: 'border-highlight/30 bg-highlight/12 text-highlight',
        neutral: 'border-border bg-secondary-soft text-muted-foreground',
      },
    },
  },
)

export interface PTagProps extends VariantProps<typeof tagClasses> {
  readonly children: JSX.Element
  readonly class?: string
}

export const PTag = (props: PTagProps) => (
  <span
    class={tagClasses({class: props.class, size: props.size, tone: props.tone})}
    data-pomo-tag=""
  >
    {props.children}
  </span>
)
