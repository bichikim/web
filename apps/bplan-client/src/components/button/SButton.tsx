import {cva} from 'class-variance-authority'
import {Component, createMemo, splitProps} from 'solid-js'
import {HButton, HButtonProps} from '@winter-love/solid-components'

interface SButtonProps extends HButtonProps {
  flat?: boolean
  glass?: boolean
  loading?: number | boolean
  outline?: boolean
  preventLoadingDisabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'default' | 'danger' | 'warning'
}

const buttonStyles = cva(
  [
    'font-medium inline-flex items-center justify-center gap-2',
    'select-none shadow-sm outline-offset-2 cursor-pointer overflow-hidden',
  ],
  {
    compoundVariants: [
      {
        className: ['bg-orange-400 hover:enabled:b-orange-400'],
        flat: true,
        variant: 'warning',
      },
      {
        className: [
          // eslint-disable-next-line max-len
          'bg-[radial-gradient(at_90%_30%,_theme(colors.orange.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.orange.200/_var(--un-bg-opacity,_1))_130%)]',
          'hover:enabled:bg-[radial-gradient(_theme(colors.orange.400),_theme(colors.orange.400))]',
        ],
        flat: false,
        variant: 'warning',
      },
      {
        className: ['bg-red-400 hover:enabled:b-red-400'],
        flat: true,
        variant: 'danger',
      },
      {
        className: [
          // eslint-disable-next-line max-len
          'bg-[radial-gradient(at_90%_30%,_theme(colors.red.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.red.200/_var(--un-bg-opacity,_1))_130%)]',
          'hover:enabled:bg-[radial-gradient(_theme(colors.red.400),_theme(colors.red.400))]',
        ],
        flat: false,
        variant: 'danger',
      },
      {
        className: [
          // eslint-disable-next-line max-len
          'bg-[radial-gradient(at_90%_30%,_theme(colors.blue.600/_var(--un-bg-opacity,_1))_50%,_theme(colors.blue.200/_var(--un-bg-opacity,_1))_130%)]',
          'hover:enabled:bg-[radial-gradient(_theme(colors.blue.600),_theme(colors.blue.600))]',
        ],
        flat: false,
        variant: 'primary',
      },
      {
        className: ['bg-blue-600 hover:enabled:b-blue-600'],
        flat: true,
        variant: 'primary',
      },
      {
        className: [
          // eslint-disable-next-line max-len
          'bg-[radial-gradient(at_90%_30%,_theme(colors.indigo.600/_var(--un-bg-opacity,_1))_50%,_theme(colors.indigo.200/_var(--un-bg-opacity,_1))_130%)]',
          'hover:enabled:bg-[radial-gradient(_theme(colors.indigo.600),_theme(colors.indigo.600))]',
        ],
        flat: false,
        variant: 'secondary',
      },
      {
        className: ['bg-indigo-600 hover:enabled:b-indigo-600'],
        flat: true,
        variant: 'secondary',
      },
      {
        className: [
          // eslint-disable-next-line max-len
          'bg-[radial-gradient(at_90%_30%,_theme(colors.gray.200/_var(--un-bg-opacity,_1))_50%,_theme(colors.white/_var(--un-bg-opacity,_1))_130%)]',
          'hover:enabled:bg-[radial-gradient(_theme(colors.gray.200),_theme(colors.gray.100))]',
        ],
        flat: false,
        variant: 'default',
      },
      {
        className: ['bg-gray-100 hover:enabled:b-gray-200'],
        flat: true,
        variant: 'default',
      },
    ],
    defaultVariants: {
      flat: false,
      glass: false,
      loading: false,
      loadingAnimation: false,
      outline: false,
      size: 'md',
      variant: 'primary',
    },
    variants: {
      flat: {
        true: '',
      },
      glass: {
        false: 'b-opacity-0',
        true: 'backdrop-blur-sm bg-opacity-90 b-opacity-80 focus:outline-opacity-50',
      },
      loading: {
        true: [
          'before:w-full before:h-full before:opacity-70',
          'before:content-[""] before:absolute before:left-0 before:top-0 before:right-0 before:bottom-0',
          'before:inset-0 before:bg-gradient-to-r before:from-transparent before:w-var-close-percent',
          'before:pointer-events-none',
        ],
      },
      loadingAnimation: {
        true: 'before:animate-loading animate-pulse-alt',
      },
      outline: {
        false: 'var-padding-offset=1px',
        true: 'b-1 b-solid',
      },
      size: {
        lg: 'p-[calc(_0.75rem+_var(--un-padding-offset,_0px))] rd-lg text-lg',
        md: 'p-[calc(_.25rem+_var(--un-padding-offset,_0px))] rd-md text-base',
        sm: 'p-[calc(_.1rem+_var(--un-padding-offset,_0px))] rd-sm text-sm',
      },
      variant: {
        danger: [
          'c-white b-red-400',
          'focus-visible:outline-red-500 focus-visible:outline-2 focus-visible:outline-solid',
          'disabled:c-red-200 before:to-red-300',
        ],
        default: [
          ' c-black b-gray-100',
          ' focus-visible:outline-gray-100 focus-visible:outline-2 focus-visible:outline-solid',
          ' disabled:c-gray-400 before:to-gray-300',
        ],
        primary: [
          ' c-white b-blue-600',
          ' focus-visible:outline-blue-600 focus-visible:outline-2 focus-visible:outline-solid',
          ' disabled:c-blue-200 before:to-white',
        ],
        secondary: [
          'c-white b-indigo-600',
          'focus-visible:outline-indigo-600 focus-visible:outline-2 focus-visible:outline-solid',
          ' disabled:c-indigo-200 before:to-white',
        ],
        warning: [
          'c-white b-orange-400',
          'focus-visible:outline-orange-500 focus-visible:outline-2 focus-visible:outline-solid',
          'disabled:c-orange-200 before:to-orange-300',
        ],
      },
    },
  },
)

export const SButton: Component<SButtonProps> = (props) => {
  const [innerProps, restProps] = splitProps(props, [
    'class',
    'glass',
    'size',
    'variant',
    'flat',
    'outline',
    'loading',
    'disabled',
    'preventLoadingDisabled',
    'children',
  ])

  const isLoading = createMemo(() => {
    if (typeof innerProps.loading === 'number') {
      return innerProps.loading > 0
    }

    return Boolean(props.loading)
  })

  const percent = createMemo(() => {
    if (typeof innerProps.loading === 'number') {
      return `${props.loading}%`
    }

    return '100%'
  })

  const isLoadingAnimation = createMemo(() => {
    return typeof innerProps.loading !== 'number' && innerProps.loading
  })

  const isDisabled = createMemo(() => {
    if (isLoading() && !innerProps.preventLoadingDisabled) {
      return true
    }

    return innerProps.disabled
  })

  return (
    <HButton
      {...restProps}
      class={buttonStyles({
        class: innerProps.class ?? 'relative',
        flat: innerProps.flat,
        glass: innerProps.glass,
        loading: isLoading(),
        loadingAnimation: isLoadingAnimation(),
        outline: innerProps.outline,
        size: innerProps.size,
        variant: innerProps.variant,
      })}
      style={{'--var-close-percent': `${percent()}`}}
      disabled={isDisabled()}
    >
      {innerProps.children}
    </HButton>
  )
}
