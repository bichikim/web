import {cva, type VariantProps} from 'class-variance-authority'

export const hamsterTriggerStyles = cva('block cursor-pointer transition-transform hover:scale-110 active:scale-95', {
  defaultVariants: {},
  variants: {},
})

export type HamsterTriggerStyleProps = VariantProps<typeof hamsterTriggerStyles>
