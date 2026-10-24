import {cva, type VariantProps} from 'class-variance-authority'

export const opinionDisplayStyles = cva('mt-12 text-gray-400 max-w-md', {
  defaultVariants: {
    variant: 'default',
  },
  variants: {
    variant: {
      default: '',
      empty: 'opacity-60',
    },
  },
})

export type OpinionDisplayStyleProps = VariantProps<typeof opinionDisplayStyles>
