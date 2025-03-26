/* eslint-disable max-len */
// root style uno
import {cx} from 'class-variance-authority'
import {ComponentProps} from 'solid-js'

const rootStyle = `:uno:
overflow-hidden relative animate-[aurora_2s_ease-in-out_infinite_alternate]
bg-[linear-gradient(45deg,var(--var-aurora-color-1),var(--var-aurora-color-2),var(--var-aurora-color-3),var(--var-aurora-color-4))]
bg-[length:400%_400%] color-transparent bg-clip-text
`

export interface SAuroraTextProps extends ComponentProps<'span'> {
  textClass?: string
}

export const SAuroraText = (props: SAuroraTextProps) => {
  return (
    <span {...props} class={cx(props.class, rootStyle)}>
      {props.children}
    </span>
  )
}
