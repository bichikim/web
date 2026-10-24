import {splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'
import {type OpinionDisplayStyleProps, opinionDisplayStyles} from './opinion-display.style'

export interface SOpinionDisplayProps extends OpinionDisplayStyleProps {
  class?: string
  message: string
}

/**
 * Styled opinion display - shows message with CVA variants
 */
export const SOpinionDisplay = (props: SOpinionDisplayProps) => {
  const [local, rest] = splitProps(props, ['message', 'class', 'variant'])

  return (
    <p {...rest} class={cx(opinionDisplayStyles({variant: local.variant}), local.class)}>
      {local.message}
    </p>
  )
}
