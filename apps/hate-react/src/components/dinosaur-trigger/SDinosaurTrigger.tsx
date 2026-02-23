import {splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'
import {HDinosaurTrigger} from './HDinosaurTrigger'
import {type DinosaurTriggerStyleProps, dinosaurTriggerStyles} from './dinosaur-trigger.style'

export interface SDinosaurTriggerProps extends DinosaurTriggerStyleProps {
  class?: string
  onClick?: (event: MouseEvent) => void
}

/**
 * Styled dinosaur trigger - clickable dinosaur with hover/active styles
 */
export const SDinosaurTrigger = (props: SDinosaurTriggerProps) => {
  const [local, rest] = splitProps(props, ['onClick', 'class'])

  return (
    <HDinosaurTrigger class={cx(dinosaurTriggerStyles(), local.class)} onClick={local.onClick}>
      <span role="img" aria-label="dinosaur">
        🦕
      </span>
    </HDinosaurTrigger>
  )
}
