import {splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'
import {HHamsterTrigger} from './HHamsterTrigger'
import {type HamsterTriggerStyleProps, hamsterTriggerStyles} from './hamster-trigger.style'
import hamsterPng from './hamster.png'

export interface SHamsterTriggerProps extends HamsterTriggerStyleProps {
  class?: string
  onClick?: (event: MouseEvent) => void
}

/**
 * Styled hamster trigger - clickable hamster with hover/active styles
 */
export const SHamsterTrigger = (props: SHamsterTriggerProps) => {
  const [local, rest] = splitProps(props, ['onClick', 'class'])

  return (
    <HHamsterTrigger {...rest} class={cx(hamsterTriggerStyles(), local.class)} onClick={local.onClick}>
      <img src={hamsterPng} alt="hamster" class="w-full h-full object-cover" />
    </HHamsterTrigger>
  )
}
