import {cva, cx, type VariantProps} from 'class-variance-authority'
import type {JSX} from 'solid-js'
import {TEXT_DETAIL} from '../typography-classes'

const TAG_CLASSES = cva(
  'inline-flex box-border items-center whitespace-nowrap rounded-full border border-solid font-[650] leading-none',
  {
    defaultVariants: {
      size: 'small',
      tone: 'neutral',
    },
    variants: {
      size: {
        medium: cx('px-2.5 py-1', TEXT_DETAIL),
        small: cx('px-1.5 py-0.5', TEXT_DETAIL),
      },
      tone: {
        danger: 'border-danger/35 bg-danger/10 text-danger',
        highlight: 'border-highlight/30 bg-highlight/12 text-highlight',
        neutral: 'border-border bg-secondary-soft text-muted-foreground',
      },
    },
  },
)

export interface PTagProps extends VariantProps<typeof TAG_CLASSES> {
  readonly children: JSX.Element
  readonly class?: string
}

export const PTag = (props: PTagProps) => (
  <span class={TAG_CLASSES({class: props.class, size: props.size, tone: props.tone})}>
    {props.children}
  </span>
)
