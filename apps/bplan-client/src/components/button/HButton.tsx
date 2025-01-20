import {now} from '@winter-love/lodash'
import {JSX, splitProps} from 'solid-js'

export interface HButtonProps
  extends Omit<
    JSX.ButtonHTMLAttributes<HTMLButtonElement>,
    'onClick' | 'onTouchEnd' | 'onDblClick'
  > {
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onDoubleClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
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
  const doubleClickGap = 250
  let clickTime = 0
  const [innerProps, restProps] = splitProps(props, [
    'onClick',
    'onTouchEnd',
    'onDoubleClick',
  ])
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

  const handleDoubleClick: HButtonProps['onDoubleClick'] = (event) => {
    innerProps.onDoubleClick?.(event)
  }

  const handleTouchEnd: HButtonProps['onTouchEnd'] = (event) => {
    innerProps.onTouchEnd?.(event)
    innerProps.onClick?.(event)

    const newClickTime = now()

    if (newClickTime - clickTime < doubleClickGap) {
      handleDoubleClick(event)

      return
    }

    clickTime = newClickTime
  }

  return (
    <button
      {...restProps}
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
    >
      {props.children}
    </button>
  )
}

export default HButton
