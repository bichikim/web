import {cva, VariantProps} from 'class-variance-authority'

const containerBase = `:uno:
font-medium inline-flex items-center justify-center gap-2 focus-visible:outline-3 focus-visible:outline-solid
select-none outline-offset--3 overflow-hidden min-w-max text-shadow-lg text-shadow-color-[var(--var-semi-focus-bg)]
c-[var(--var-text-color)] b-[var(--var-color)] focus-visible:outline-[var(--var-focus-bg)]
 disabled:c-[var(--var-muted-color)] before:to-[var(--var-semi-focus-bg)]
`

const colorVariants = {
  aurora: `:uno:
   color-var-text-color=white var-color=transparent var-focus-bg=black var-muted-color=gray-400
    var-semi-muted-color=gray-300 var-semi-focus-bg=gray-200
   var-aurora-color-1=#00c2ff var-aurora-color-2=#33ff8c var-aurora-color-3=#ffc640 var-aurora-color-4=#e54cff`,
  default: `:uno: color-var-text-color=black var-color=gray-100 var-focus-bg=black var-muted-color=gray-400
   var-semi-muted-color=gray-300 var-semi-focus-bg=white`,
  error: `:uno: color-var-text-color=white  var-color=red-400 var-focus-bg=red-700 var-muted-color=red-200
   var-semi-muted-color=red-300 var-semi-focus-bg=red-500`,
  info: `:uno: color-var-text-color=white var-color=sky-400 var-focus-bg=sky-700 var-muted-color=sky-200
   var-semi-muted-color=sky-300 var-semi-focus-bg=sky-500`,
  primary: `:uno: color-var-text-color=white var-color=blue-400 var-focus-bg=blue-700 var-muted-color=blue-200
   var-semi-muted-color=white var-semi-focus-bg=blue-500`,
  secondary: `:uno: color-var-text-color=white var-color=indigo-400 var-focus-bg=indigo-700 var-muted-color=indigo-200
   var-semi-muted-color=white var-semi-focus-bg=indigo-500`,
  success: `:uno: color-var-text-color=white var-color=green-400 var-focus-bg=green-700 var-muted-color=green-200
   var-semi-muted-color=green-300 var-semi-focus-bg=green-500`,
  transparent: `:uno: color-var-text-color=black var-color=transparent var-focus-bg=black var-muted-color=gray-400
   var-semi-muted-color=gray-300 var-semi-focus-bg=gray-200`,
  warning: `:uno: color-var-text-color=white var-color=orange-400 var-focus-bg=orange-700 var-muted-color=orange-200
   var-semi-muted-color=orange-300 var-semi-focus-bg=orange-500`,
}

const sizeVariants = {
  lg: `:uno:
p-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-lg text-lg
`,
  md: `:uno:
p-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-md text-base
`,
  sm: `:uno:
p-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-sm text-sm
`,
  xl: `:uno:
p-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-xl text-xl
`,
  xs: `:uno:
p-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-xs text-xs
`,
}

const sizeWildVariants = {
  lg: `:uno:
py-[calc(_0.75rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))]
 rd-lg text-lg
`,
  md: `:uno:
py-[calc(_.25rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))]
 rd-md text-base
`,
  sm: `:uno:
py-[calc(_.1rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))]
 rd-sm text-sm
`,
  xl: `:uno:
py-[calc(_1rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))]
 rd-xl text-xl
`,
  xs: `:uno:
py-[calc(_.05rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))]
 rd-xs text-xs
`,
}

const glass = `:uno:
backdrop-blur-sm bg-opacity-90 b-opacity-80 focus:outline-opacity-50
`

const loading = `:uno:
before:h-full before:opacity-70   data-[loading-animation=true]:before:animate-slide
data-[loading=true]:before:content-[""] before:absolute before:left-0 before:top-0 before:right-0 before:bottom-0
before:inset-0 before:bg-gradient-to-r before:from-transparent before:w-[var(--var-progress-percent)]
before:pointer-events-none before:transition-width before:duration-300
`

export const containerStyles = cva([containerBase, loading], {
  compoundVariants: [
    // >> wild
    {
      className: [sizeWildVariants.xl],
      size: 'xl',
      wild: true,
    },
    {
      className: [sizeWildVariants.lg],
      size: 'lg',
      wild: true,
    },
    {
      className: [sizeWildVariants.md],
      size: 'md',
      wild: true,
    },
    {
      className: [sizeWildVariants.sm],
      size: 'sm',
      wild: true,
    },
    {
      className: [sizeWildVariants.xs],
      size: 'xs',
      wild: true,
    },
    {
      className: [sizeVariants.xl],
      size: 'xl',
      wild: false,
    },
    {
      className: [sizeVariants.lg],
      size: 'lg',
      wild: false,
    },
    {
      className: [sizeVariants.md],
      size: 'md',
      wild: false,
    },
    {
      className: [sizeVariants.sm],
      size: 'sm',
      wild: false,
    },
    {
      className: [sizeVariants.xs],
      size: 'xs',
      wild: false,
    },
    // << wild
    // >> padding
    {
      className: [':uno: var-padding=.05rem'],
      fit: true,
      size: 'xs',
    },
    {
      className: [':uno: var-padding=.1rem'],
      fit: true,
      size: 'sm',
    },
    {
      className: [':uno: var-padding=.25rem'],
      fit: true,
      size: 'md',
    },
    {
      className: [':uno: var-padding=.75rem'],
      fit: true,
      size: 'lg',
    },
    {
      className: [':uno: var-padding=1.25rem'],
      fit: true,
      size: 'xl',
    },
    {
      className: [':uno: var-padding=.15rem'],
      fit: false,
      size: 'xs',
    },
    {
      className: [':uno: var-padding=.25rem'],
      fit: false,
      size: 'sm',
    },
    {
      className: [':uno: var-padding=.75rem'],
      fit: false,
      size: 'md',
    },
    {
      className: [':uno: var-padding=1.25rem'],
      fit: false,
      size: 'lg',
    },
    {
      className: [':uno: var-padding=1.75rem'],
      fit: false,
      size: 'xl',
    },
    // << padding
    // >> colors
    {
      className: [':uno: aurora'],
      color: 'aurora',
    },
    {
      className: [':uno: bg-[var(--var-color)] hover:enabled:b-[--var-color]'],
      color: [
        'default',
        'error',
        'info',
        'primary',
        'secondary',
        'success',
        'transparent',
        'warning',
      ],
      flat: true,
    },
    {
      className: [
        ':uno: shadow-sm bg-[radial-gradient(at_90%_30%,_var(--var-color)_50%,_var(--var-muted-color)_130%)]',
      ],
      color: [
        'default',
        'error',
        'info',
        'primary',
        'secondary',
        'success',
        'transparent',
        'warning',
      ],
      flat: false,
    },
    // << colors
  ],
  defaultVariants: {
    color: 'default',
    cursor: false,
    fit: false,
    flat: false,
    glass: false,
    outline: false,
    preventLoadingPulse: false,
    size: 'md',
    wild: false,
  },
  variants: {
    color: {
      ...colorVariants,
    },
    cursor: {
      false: '',
      true: ':uno: cursor-pointer',
    },
    fit: {
      true: '',
    },
    flat: {
      false: '',
      true: '',
    },
    glass: {
      false: '',
      true: glass,
    },
    outline: {
      false: ':uno: var-padding-offset=1px',
      true: ':uno: b-1 b-solid',
    },
    preventLoadingPulse: {
      false: ':uno: data-[loading=true]:animate-pulse-alt',
      true: '',
    },
    size: {
      lg: '',
      md: '',
      sm: '',
      xl: '',
      xs: '',
    },
    wild: {
      true: '',
    },
  },
})

export type ContainerStyleProps = VariantProps<typeof containerStyles>
