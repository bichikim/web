import {cva, type VariantProps} from 'class-variance-authority'

export const footerLinkStyles = cva('text-amber-400 hover:text-amber-300 underline', {
  defaultVariants: {},
  variants: {},
})

export const footerLinksContainerStyles = cva('mt-8 flex gap-4', {
  defaultVariants: {},
  variants: {},
})

export type FooterLinkStyleProps = VariantProps<typeof footerLinkStyles>
