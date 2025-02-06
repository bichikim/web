import {cva, cx} from 'class-variance-authority'
import {Component, splitProps} from 'solid-js'
import {HButton, HButtonProps} from '@winter-love/solid-components'

interface SButtonProps extends HButtonProps {
  glass?: boolean
  outline?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'default'
}

const buttonStyles = cva(
  cx(
    'font-medium inline-flex items-center justify-center gap-2',
    'select-none shadow-sm outline-offset-2 cursor-pointer',
  ),
  {
    defaultVariants: {
      glass: false,
      outline: false,
      size: 'md',
      variant: 'primary',
    },
    variants: {
      glass: {
        false: 'b-opacity-0',
        true: 'backdrop-blur-sm bg-opacity-90 b-opacity-80 focus:outline-opacity-50',
      },
      outline: {
        true: 'b-1 b-solid',
      },
      size: {
        lg: 'h-11 px-6 rd-lg text-lg',
        md: 'h-9 px-4 rd-md text-base',
        sm: 'h-7 px-3 rd-sm text-sm',
      },
      variant: {
        default: [
          ' c-gray-900 b-gray-100',
          'hover:bg-gray-200',
          // eslint-disable-next-line max-len
          'bg-[radial-gradient(at_90%_30%,_theme(colors.gray.300/_var(--un-bg-opacity,_1))_50%,_theme(colors.white/_var(--un-bg-opacity,_1))_130%)]',
          'hover:bg-[radial-gradient(_theme(colors.gray.100),_theme(colors.gray.100))] hover:b-gray-100',
          ' focus:enabled:outline-gray-100 focus:enabled:outline-2 focus:enabled:outline-solid',
          'active:bg-gray-300',
          'disabled:bg-gray-100 disabled:c-gray-400',
        ],
        primary: [
          ' c-white b-blue-500',
          // eslint-disable-next-line max-len
          'bg-[radial-gradient(at_90%_30%,_theme(colors.blue.600/_var(--un-bg-opacity,_1))_50%,_theme(colors.blue.200/_var(--un-bg-opacity,_1))_130%)]',
          'hover:enabled:bg-[radial-gradient(_theme(colors.blue.600),_theme(colors.blue.600))]',
          ' hover:enabled:b-blue-600',
          ' focus:outline-blue-600 focus:outline-2 focus:outline-solid',
          'disabled:bg-opacity-70 disabled:c-blue-200',
        ],
        secondary: [
          'c-white b-indigo-500',
          // eslint-disable-next-line max-len
          'bg-[radial-gradient(at_90%_30%,_theme(colors.indigo.600/_var(--un-bg-opacity,_1))_50%,_theme(colors.indigo.200/_var(--un-bg-opacity,_1))_130%)]',
          'hover:bg-[radial-gradient(_theme(colors.indigo.600),_theme(colors.indigo.600))] hover:b-indigo-600',
          'focus:enabled:outline-indigo-600 focus:enabled:outline-2 focus:enabled:outline-solid',
          'disabled:bg-indigo-100 disabled:c-indigo-300',
        ],
      },
    },
  },
)

export const SButton: Component<SButtonProps> = (props) => {
  const [innerProps, restProps] = splitProps(props, ['class', 'glass', 'size', 'variant'])

  return (
    <HButton
      {...restProps}
      class={buttonStyles({
        class: innerProps.class,
        glass: innerProps.glass,
        size: innerProps.size,
        variant: innerProps.variant,
      })}
    />
  )
}
