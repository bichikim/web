import {ComponentProps} from 'solid-js'
import {cva} from 'class-variance-authority'

const rootStyle = cva('', {
  variants: {
    size: {
      lg: 'text-lg py-.5 px-1.5 rd-1',
      md: 'text-base py-.5 px-1.5 rd-1',
      sm: 'text-sm py-.5 px-1.5 rd-1',
    },
  },
})

export interface STextProps extends ComponentProps<'span'> {
  size?: 'sm' | 'md' | 'lg'
}

export const SText = (props: STextProps) => {
  return <span {...props} class={rootStyle({class: props.class, size: props.size})} />
}
