import {cx} from 'class-variance-authority'
import {ComponentProps} from 'solid-js'

export interface SAuroraTextProps extends ComponentProps<'span'> {
  textClass?: string
}

export const SAuroraText = (props: SAuroraTextProps) => {
  return (
    <span {...props} class={cx(props.class, 'aurora', 'color-transparent', 'bg-clip-text')}>
      {props.children}
    </span>
  )
}
