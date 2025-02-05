import {now} from '@winter-love/lodash'
import {ComponentProps, createMemo, JSX, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'

const DEFAULT_DOUBLE_CLICK_GAP = 250

export type HButtonType = 'button' | 'anchor' | 'anchor-button'

export interface HButtonProps
  extends Omit<
    ComponentProps<'button'>,
    'onClick' | 'onTouchEnd' | 'onDblClick' | 'onTouchStart' | 'type'
  > {
  doubleClickGap?: number
  href?: string
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onDoubleClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onTouchEnd?: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  onTouchStart?: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  type?: HButtonType
}

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
  // Previous click time used to check if current click is a double click
  let clickTime = 0
  let touchdown = false

  const [innerProps, restProps] = splitProps(props, [
    'onClick',
    'onTouchEnd',
    'onDoubleClick',
    'onTouchStart',
    'doubleClickGap',
    'type',
    'href',
  ])

  /**
   * Handles the `click` event for the button component and forwards it to the parent component.
   *
   * @param event The mouse event triggered by user interaction.
   */
  const handleClick: HButtonProps['onClick'] = (event: any) => {
    // skip touch event
    // skip anchor event because it will navigate to the href
    if (event.pointerType === 'touch' || innerProps.type === 'anchor') {
      return
    }

    innerProps.onClick?.(event)
  }

  /**
   * Handles the `doubleClick` event for the button component and forwards it to the parent component.
   * @param event The mouse event triggered by user interaction.
   */
  const handleDoubleClick: HButtonProps['onDoubleClick'] = (event) => {
    // skip anchor event because it will navigate to the href
    if (innerProps.type === 'anchor') {
      return
    }

    // pass original event to parent
    innerProps.onDoubleClick?.(event)
  }

  const handleTouchStart: HButtonProps['onTouchStart'] = (event) => {
    touchdown = true
    // pass original event to parent
    innerProps.onTouchStart?.(event)
  }

  /**
   * Touch devices do not trigger double click events, so we need to calculate the touch events directly to trigger double click events.
   * @param event
   * @returns
   */
  const handleTouchEnd: HButtonProps['onTouchEnd'] = (event) => {
    // pass original event to parent
    innerProps.onTouchEnd?.(event)

    // anchor use href to navigate
    if (innerProps.type === 'anchor') {
      return
    }

    const doubleClickGap = innerProps.doubleClickGap ?? DEFAULT_DOUBLE_CLICK_GAP
    const newClickTime = now()

    if (touchdown) {
      innerProps.onClick?.(event)
      touchdown = false
    }

    if (newClickTime - clickTime < doubleClickGap) {
      handleDoubleClick(event)

      return
    }

    clickTime = newClickTime
  }

  const href = createMemo(() => {
    switch (innerProps.type) {
      case 'anchor': {
        return innerProps.href
      }

      default: {
        return ''
      }
    }
  })

  return (
    <Dynamic
      component={innerProps.type === 'button' ? 'button' : 'a'}
      {...restProps}
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      href={href()}
    >
      {props.children}
    </Dynamic>
  )
}
