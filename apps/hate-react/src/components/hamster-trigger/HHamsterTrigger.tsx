import type {JSX, ParentProps} from 'solid-js'

export interface HHamsterTriggerProps extends ParentProps {
  class?: string
  onClick?: (event: MouseEvent) => void
}

/**
 * Headless: Wraps children, invokes onClick on click (prevents default on anchor)
 */
export const HHamsterTrigger = (props: HHamsterTriggerProps): JSX.Element => {
  const handleClick = (event: MouseEvent) => {
    event.preventDefault()
    props.onClick?.(event)
  }

  return (
    <a href="#" class={props.class} onClick={handleClick} role="button" tabindex={0}>
      {props.children}
    </a>
  )
}
