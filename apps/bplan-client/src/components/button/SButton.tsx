/* eslint-disable max-len */
import {cva} from 'class-variance-authority'
import {Component, createMemo, splitProps} from 'solid-js'
import {HButton, HButtonProps} from '@winter-love/solid-components'

export interface SButtonProps extends HButtonProps {
  fit?: boolean
  flat?: boolean
  glass?: boolean
  loading?: number | boolean
  outline?: boolean
  preventLoadingDisabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'default' | 'danger' | 'warning' | 'transparent'
}

const buttonBase = `:uno:
font-medium inline-flex items-center justify-center gap-2 focus-visible:outline-3 focus-visible:outline-solid
select-none outline-offset--3 cursor-pointer overflow-hidden
`

const buttonDanger = `:uno:
c-white b-red-400 focus-visible:outline-red-700 disabled:c-red-200 before:to-red-300
`

const buttonDefault = `:uno:
c-black b-gray-100 focus-visible:outline-black disabled:c-gray-400 before:to-gray-300
`

const buttonPrimary = `:uno:
c-white b-blue-400 focus-visible:outline-blue-700 disabled:c-blue-200 before:to-white
`

const buttonSecondary = `:uno:
c-white b-indigo-400 focus-visible:outline-indigo-700 disabled:c-indigo-200 before:to-white
`

const buttonTransparent = `:uno:
c-black b-transparent focus-visible:outline-black disabled:c-gray-400 before:to-gray-300
`

const buttonWarning = `:uno:
c-white b-orange-400 focus-visible:outline-orange-700 disabled:c-orange-200 before:to-orange-300
`

const buttonWarningNoneFlat = `:uno:
bg-[radial-gradient(at_90%_30%,_theme(colors.orange.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.orange.200/_var(--un-bg-opacity,_1))_130%)]
hover:enabled:bg-[radial-gradient(_theme(colors.orange.400),_theme(colors.orange.400))]
`

const buttonDangerNoneFlat = `:uno:
bg-[radial-gradient(at_90%_30%,_theme(colors.red.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.red.200/_var(--un-bg-opacity,_1))_130%)]
hover:enabled:bg-[radial-gradient(_theme(colors.red.400),_theme(colors.red.400))]
`

const buttonDefaultNoneFlat = `:uno:
bg-[radial-gradient(at_90%_30%,_theme(colors.gray.200/_var(--un-bg-opacity,_1))_50%,_theme(colors.white/_var(--un-bg-opacity,_1))_130%)]
hover:enabled:bg-[radial-gradient(_theme(colors.gray.200),_theme(colors.gray.100))]
`

const buttonPrimaryNoneFlat = `:uno:
bg-[radial-gradient(at_90%_30%,_theme(colors.blue.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.blue.200/_var(--un-bg-opacity,_1))_130%)]
hover:enabled:bg-[radial-gradient(_theme(colors.blue.400),_theme(colors.blue.600))]
`

const buttonSecondaryNoneFlat = `:uno:
bg-[radial-gradient(at_90%_30%,_theme(colors.indigo.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.indigo.200/_var(--un-bg-opacity,_1))_130%)]
hover:enabled:bg-[radial-gradient(_theme(colors.indigo.400),_theme(colors.indigo.600))]
`

const buttonTransparentNoneFlat = `:uno:
bg-[radial-gradient(at_90%_30%,_theme(colors.gray.200/_var(--un-bg-opacity,_1))_50%,_theme(colors.white/_var(--un-bg-opacity,_1))_130%)]
hover:enabled:bg-[radial-gradient(_theme(colors.gray.200),_theme(colors.gray.100))]
`

const buttonLg = `:uno:
py-[calc(_0.75rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-lg text-lg
`

const buttonMd = `:uno:
py-[calc(_.25rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-md text-base
`

const buttonSm = `:uno:
py-[calc(_.1rem+_var(--var-padding-offset,_0px))] px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))] rd-sm text-sm
`

const buttonGlass = `:uno:
backdrop-blur-sm bg-opacity-90 b-opacity-80 focus:outline-opacity-50
`

const buttonLoading = `:uno:
before:w-full before:h-full before:opacity-70 before:z--1
before:content-[""] before:absolute before:left-0 before:top-0 before:right-0 before:bottom-0
before:inset-0 before:bg-gradient-to-r before:from-transparent before:w-var-close-percent
before:pointer-events-none animate-pulse-alt
`

const buttonStyles = cva(buttonBase, {
  compoundVariants: [
    {
      className: ':uno: bg-orange-400 hover:enabled:b-orange-400',
      flat: true,
      variant: 'warning',
    },
    {
      className: buttonWarningNoneFlat,
      flat: false,
      variant: 'warning',
    },
    {
      className: ':uno: bg-red-400 hover:enabled:b-red-400',
      flat: true,
      variant: 'danger',
    },
    {
      className: buttonDangerNoneFlat,
      flat: false,
      variant: 'danger',
    },
    {
      className: buttonPrimaryNoneFlat,
      flat: false,
      variant: 'primary',
    },
    {
      className: ':uno: bg-blue-400 hover:enabled:b-blue-400',
      flat: true,
      variant: 'primary',
    },
    {
      className: buttonSecondaryNoneFlat,
      flat: false,
      variant: 'secondary',
    },
    {
      className: ':uno: bg-indigo-400 hover:enabled:b-indigo-400',
      flat: true,
      variant: 'secondary',
    },
    {
      className: buttonDefaultNoneFlat,
      flat: false,
      variant: 'default',
    },
    {
      className: ':uno: bg-gray-100 hover:enabled:b-gray-20',
      flat: true,
      variant: 'default',
    },
    {
      className: buttonTransparentNoneFlat,
      flat: false,
      variant: 'transparent',
    },
    {
      className: ':uno: bg-transparent hover:enabled:b-transparent',
      flat: true,
      variant: 'transparent',
    },
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
      false: 'shadow-sm',
      true: '',
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
      lg: buttonLg,
      md: buttonMd,
      sm: buttonSm,
    },
    variant: {
      danger: buttonDanger,
      default: buttonDefault,
      primary: buttonPrimary,
      secondary: buttonSecondary,
      transparent: buttonTransparent,
      warning: buttonWarning,
    },
  },
})

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
    'fit',
  ])

  const isLoading = createMemo(() => {
    if (typeof innerProps.loading === 'number') {
      return innerProps.loading > 0
    }

    return Boolean(props.loading)
  })

  const style = createMemo(() => {
    if (typeof innerProps.loading === 'number') {
      return {
        '--var-close-percent': `${props.loading}%`,
      }
    }
  })

  const isLoadingAnimation = createMemo(() => {
    return innerProps.loading === true
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
        fit: innerProps.fit,
        flat: innerProps.flat,
        glass: innerProps.glass,
        loading: isLoading(),
        loadingAnimation: isLoadingAnimation(),
        outline: innerProps.outline,
        size: innerProps.size,
        variant: innerProps.variant,
      })}
      style={style()}
      disabled={isDisabled()}
    >
      {innerProps.children}
    </HButton>
  )
}
