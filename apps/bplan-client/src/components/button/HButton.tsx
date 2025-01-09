import {JSX, splitProps} from 'solid-js'

export interface HButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onTouchEnd'> {
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
  const [innerProps, restProps] = splitProps(props, ['onClick', 'onTouchEnd'])
  /**
   * Handles the `click` event for the button component and forwards it to the parent component.
   *
   * @param event The mouse event triggered by user interaction.
   */
  const handleClick: HButtonProps['onClick'] = (event: any) => {
    // skip touch
    if (event.pointerType === 'touch') {
      return
    }

    innerProps.onClick?.(event)
  }

  const handleTouchEnd: HButtonProps['onTouchEnd'] = (event) => {
    innerProps.onClick?.(event)
    innerProps.onTouchEnd?.(event)
  }

  return (
    <button {...restProps} on:click={handleClick} onTouchEnd={handleTouchEnd}>
      {props.children}
    </button>
  )
}

export default HButton
