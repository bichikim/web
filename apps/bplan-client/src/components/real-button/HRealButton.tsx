import {Component, createUniqueId, ParentProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {useGlobalTouch} from './use-global-touch'

export interface HRealButtonAsProps {
  isDown: boolean
}

export interface HRealButtonProps extends ParentProps {
  /**
   *
   */
  as?: Component<HRealButtonAsProps>
}

/**
 * A component that behaves like a physical button in the real world
 * If you press it with your finger, it will be pressed, and if your finger leaves the button while it is pressed, the button will not be pressed
 * If you press and hold your finger and move your finger to enter the button, the button will be pressed
 */
export const HRealButton = (props: HRealButtonProps) => {
  const id = createUniqueId()
  const isDown = useGlobalTouch(id)

  return <Dynamic component={props.as} isDown={isDown()} />
}
