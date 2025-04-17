/* eslint-disable max-len */
import {cva, VariantProps} from 'class-variance-authority'

const buttonBase = `:uno:
font-medium inline-flex items-center justify-center gap-2 focus-visible:outline-3 focus-visible:outline-solid
select-none outline-offset--3 cursor-pointer overflow-hidden min-w-max
c-[var(--var-text-color)] b-[var(--var-color)] focus-visible:outline-[var(--var-focus-bg)] disabled:c-[var(--var-muted-color)] before:to-[var(--var-semi-muted-color)]
`

const colorVariants = {
  danger: `uno: color-var-text-color=white  var-color=red-400 var-focus-bg=red-700 var-muted-color=red-200 var-semi-muted-color=red-300`,
  default: `uno: color-var-text-color=black var-color=gray-100 var-focus-bg=black var-muted-color=gray-400 var-semi-muted-color=gray-300`,
  primary: `uno: color-var-text-color=white var-color=blue-400 var-focus-bg=blue-700 var-muted-color=blue-200 var-semi-muted-color=white`,
  secondary: `uno: color-var-text-color=white var-color=indigo-400 var-focus-bg=indigo-700 var-muted-color=indigo-200 var-semi-muted-color=white`,
  transparent: `uno: color-var-text-color=black var-color=transparent var-focus-bg=black var-muted-color=gray-400 var-semi-muted-color=gray-300`,
  warning: `uno: color-var-text-color=white var-color=orange-400 var-focus-bg=orange-700 var-muted-color=orange-200 var-semi-muted-color=orange-300`,
}

const sizeVariants = {
  lg: `:uno:
py-[calc(_0.75rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-lg text-lg
`,
  md: `:uno:
py-[calc(_.25rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-md text-base
`,
  sm: `:uno:
py-[calc(_.1rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-sm text-sm
`,
}

const buttonGlass = `:uno:
backdrop-blur-sm bg-opacity-90 b-opacity-80 focus:outline-opacity-50
`

const buttonLoading = `:uno:
before:w-full before:h-full before:opacity-70 before:z--1
before:content-[""] before:absolute before:left-0 before:top-0 before:right-0 before:bottom-0
before:inset-0 before:bg-gradient-to-r before:from-transparent before:w-[var(--var-close-percent)]
before:pointer-events-none animate-pulse-alt
`

export const buttonStyles = cva(buttonBase, {
  compoundVariants: [
    {
      className: ['var-padding=.1rem'],
      fit: true,
      size: 'sm',
    },
    {
      className: ['var-padding=.25rem'],
      fit: true,
      size: 'md',
    },
    {
      className: ['var-padding=.75rem'],
      fit: true,
      size: 'lg',
    },
    {
      className: ['var-padding=.25rem'],
      fit: false,
      size: 'sm',
    },
    {
      className: ['var-padding=.75rem'],
      fit: false,
      size: 'md',
    },
    {
      className: ['var-padding=1.25rem'],
      fit: false,
      size: 'lg',
    },
  ],
  defaultVariants: {
    fit: false,
    flat: false,
    glass: false,
    loading: false,
    loadingAnimation: false,
    outline: false,
    size: 'md',
    variant: 'default',
  },
  variants: {
    fit: {
      true: '',
    },
    flat: {
      false:
        ':uno: shadow-sm bg-[radial-gradient(at_90%_30%,_var(--var-color)_50%,_var(--var-muted-color)_130%)]',
      true: ':uno: bg-[var(--var-color)] hover:enabled:b-[--var-color]',
    },
    glass: {
      false: '',
      true: buttonGlass,
    },
    loading: {
      false: '',
      true: buttonLoading,
    },
    loadingAnimation: {
      true: 'before:animate-slide',
    },
    outline: {
      false: ':uno: var-padding-offset=1px',
      true: ':uno: b-1 b-solid',
    },
    size: {
      lg: sizeVariants.lg,
      md: sizeVariants.md,
      sm: sizeVariants.sm,
    },
    variant: {
      danger: colorVariants.danger,
      default: colorVariants.default,
      primary: colorVariants.primary,
      secondary: colorVariants.secondary,
      transparent: colorVariants.transparent,
      warning: colorVariants.warning,
    },
  },
})

export type SButtonStyleProps = VariantProps<typeof buttonStyles>
