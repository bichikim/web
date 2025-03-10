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

const buttonStyles = cva('__button-base', {
  compoundVariants: [
    {
      className: ['bg-orange-400 hover:enabled:b-orange-400'],
      flat: true,
      variant: 'warning',
    },
    {
      className: '__button-warning-none-flat',
      flat: false,
      variant: 'warning',
    },
    {
      className: ['bg-red-400 hover:enabled:b-red-400'],
      flat: true,
      variant: 'danger',
    },
    {
      className: '__button-danger-none-flat',
      flat: false,
      variant: 'danger',
    },
    {
      className: '__button-primary-none-flat',
      flat: false,
      variant: 'primary',
    },
    {
      className: ['bg-blue-400 hover:enabled:b-blue-400'],
      flat: true,
      variant: 'primary',
    },
    {
      className: '__button-secondary-none-flat',
      flat: false,
      variant: 'secondary',
    },
    {
      className: ['bg-indigo-400 hover:enabled:b-indigo-400'],
      flat: true,
      variant: 'secondary',
    },
    {
      className: '__button-default-none-flat',
      flat: false,
      variant: 'default',
    },
    {
      className: ['bg-gray-100 hover:enabled:b-gray-200'],
      flat: true,
      variant: 'default',
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
      false: '__button-none-glass',
      true: '__button-glass',
    },
    loading: {
      true: '__button-loading',
    },
    loadingAnimation: {
      true: 'before:animate-slide',
    },
    outline: {
      false: '__button-none-outline',
      true: '__button-outline',
    },
    size: {
      lg: '__button-lg',
      md: '__button-md',
      sm: '__button-sm',
    },
    variant: {
      danger: '__button-danger',
      default: '__button-default',
      primary: '__button-primary',
      secondary: '__button-secondary',
      transparent: '__button-transparent',
      warning: '__button-warning',
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
