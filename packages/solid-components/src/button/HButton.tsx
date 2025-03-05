import {splitProps} from 'solid-js'
import {ButtonBody, ButtonBodyProps} from './ButtonBody'
import {ButtonProvider, ButtonProviderProps} from './ButtonProvider'

export type HButtonProps = ButtonBodyProps & ButtonProviderProps

/**
 * A customizable button component that triggers a click event when a touch event occurs.
 *
 * This component is designed to work seamlessly with both mouse and touch interactions.
 * It ensures that a `click` event is fired when a `touchend` event occurs, making it
 * suitable for touch-based devices. Double click/tap events are also supported.
 *
 * @example
 * ```tsx
 * <HButton
 *   onClick={(e) => console.log('Clicked!', e)}
 *   onDoubleClick={(e) => console.log('Double clicked!', e)}
 * >
 *   Click Me
 * </HButton>
 * ```
 *
 * @param props {HButtonProps} The props for the button component.
 * @prop {JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>} [onClick] - Event handler for the `click` event.
 * @prop {JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>} [onDoubleClick] - Event handler for double click/tap events.
 * @prop {JSX.EventHandler<HTMLButtonElement, TouchEvent>} [onTouchEnd] - Event handler for the `touchend` event.
 */
export const HButton = (props: HButtonProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'onClick',
    'onTouchEnd',
    'onDoubleClick',
    'onTouchStart',
    'doubleClickGap',
    'type',
    'href',
  ])

  return (
    <ButtonProvider {...innerProps}>
      <ButtonBody {...restProps}>{props.children}</ButtonBody>
    </ButtonProvider>
  )
}
