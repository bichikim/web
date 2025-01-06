import {JSX} from 'solid-js'

export interface HButtonProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'onClick' | 'onTouchEnd'> {
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onTouchEnd?: JSX.EventHandler<HTMLButtonElement, TouchEvent>
}

/**
 * A customizable button component that triggers a click event when a touch event occurs.
 *
 * This component is designed to work seamlessly with both mouse and touch interactions.
 * It ensures that a `click` event is fired when a `touchend` event occurs, making it
 * suitable for touch-based devices.
 *
 * @example
 * ```tsx
 * <HButton onClick={(e) => console.log('Clicked!', e)}>
 *   Click Me
 * </HButton>
 * ```
 *
 * @param props {HButtonProps} The props for the button component.
 * @prop {JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>} [onClick] - Event handler for the `click` event.
 * @prop {JSX.EventHandler<HTMLButtonElement, TouchEvent>} [onTouchEnd] - Event handler for the `touchend` event.
 */
export const HButton = (props: HButtonProps) => {
  /**
   * Handles the `click` event for the button component and forwards it to the parent component.
   *
   * @param event The mouse event triggered by user interaction.
   */
  const handleClick: HButtonProps['onClick'] = (event) => {
    props.onClick?.(event)
  }

  /**
   * Handles the `click` or `touch` event for the button component.
   *
   * @param event The touch event triggered by user interaction.
   */
  const handleTouchEnd: HButtonProps['onTouchEnd'] = (event) => {
    props.onTouchEnd?.(event)
    props.onClick?.(event)
  }

  return (
    <button {...props} onClick={handleClick} onTouchEnd={handleTouchEnd}>
      {props.children}
    </button>
  )
}

export default HButton
