import {cva} from 'class-variance-authority'
import {Component} from 'solid-js'
import {HButton, HButtonProps} from '@winter-love/solid-components'

interface SButtonProps extends HButtonProps {
  glass?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline'
}

const buttonStyles = cva(
  'font-medium transition-all inline-flex items-center justify-center gap-2' +
    'select-none outline-none backdrop-blur-sm shadow-sm',
  {
    defaultVariants: {
      glass: false,
      size: 'md',
      variant: 'primary',
    },
    variants: {
      glass: {
        false: '',
        true: 'backdrop-blur-sm bg-opacity-80',
      },
      size: {
        lg: 'h-11 px-6 rd-lg text-lg',
        md: 'h-9 px-4 rd-md text-base',
        sm: 'h-7 px-3 rd-sm text-sm',
      },
      variant: {
        default: [
          'bg-gray-100 c-gray-900',
          'hover:bg-gray-200',
          'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
          'active:bg-gray-300',
          'disabled:bg-gray-100 disabled:c-gray-400',
          'b-2 b-transparent',
        ],
        outline: [
          'b-2 bg-white/80 c-gray-900',
          'hover:bg-gray-50',
          'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
          'active:bg-gray-100b',
          'disabled:bg-white disabled:c-gray-300 disabled:b-gray-200',
        ],
        primary: [
          'bg-blue-600 c-white b-transparent',
          'hover:bg-blue-700',
          'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'active:bg-blue-800',
          'disabled:bg-blue-100 disabled:c-blue-400',
        ],
        secondary: [
          'bg-indigo-600 c-white b-transparent',
          'hover:bg-indigo-700',
          'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          'active:bg-indigo-800',
          'disabled:bg-indigo-50 disabled:c-indigo-300',
        ],
      },
    },
  },
)

export const SButton: Component<SButtonProps> = (props) => {
  return (
    <HButton
      {...props}
      class={buttonStyles({
        class: props.class,
        glass: props.glass,
        size: props.size,
        variant: props.variant,
      })}
    />
  )
}
