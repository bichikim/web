import {ComponentProps} from 'solid-js'
import {cva} from 'class-variance-authority'

const dividerStyles = cva(
  'h-.2rem bg-gray-200 b-b-.05rem b-b-solid b-b-gray-400 rd-1rem',
  {
    variants: {
      type: {
        horizontal: 'h-full',
        vertical: 'w-full',
      },
    },
  },
)

export interface SDividerProps extends ComponentProps<'div'> {
  type: 'horizontal' | 'vertical'
}

export const SDivider = (props: SDividerProps) => {
  return (
    <div {...props} class={dividerStyles({class: props.class, type: props.type})}>
      {props.children}
    </div>
  )
}
