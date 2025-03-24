import {createMemo, JSX, mergeProps, ParentProps} from 'solid-js'
import {now} from '@winter-love/lodash'
import {ButtonContext, ButtonContextProps} from './context'

export type ButtonType = 'button' | 'anchor' | 'anchor-button'

export interface ButtonProviderProps extends ParentProps {
  disabled?: boolean
  doubleClickGap?: number
  href?: string
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onDoubleClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onFocusEnter?: (event: KeyboardEvent) => void
  onTouchEnd?: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  onTouchStart?: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  type?: ButtonType
}

const DEFAULT_DOUBLE_CLICK_GAP = 250

export const ButtonProvider = (props: ButtonProviderProps) => {
  // Previous click time used to check if current click is a double click
  let clickTime = 0
  let touchdown = false

  const defaultProps = mergeProps(
    {
      doubleClickGap: DEFAULT_DOUBLE_CLICK_GAP,
      type: 'button',
    },
    props,
  )

  /**
   * Handles the `click` event for the button component and forwards it to the parent component.
   *
   * @param event The mouse event triggered by user interaction.
   */
  const handleClick: ButtonProviderProps['onClick'] = (event: any) => {
    // skip touch event
    // skip anchor event because it will navigate to the href
    if (event.pointerType === 'touch' || defaultProps.type === 'anchor') {
      return
    }

    const _doubleClickGap = defaultProps.doubleClickGap
    const newClickTime = now()

    if (newClickTime - clickTime < _doubleClickGap) {
      defaultProps.onDoubleClick?.(event)

      return
    }

    clickTime = newClickTime
    defaultProps.onClick?.(event)
  }

  /**
   * Handles the `doubleClick` event for the button component and forwards it to the parent component.
   * @param event The mouse event triggered by user interaction.
   */
  // const handleDoubleClick: ButtonProviderProps['onDoubleClick'] = (event) => {
  //   console.log('handleDoubleClick', event)

  //   // skip anchor event because it will navigate to the href
  //   if (defaultProps.type === 'anchor') {
  //     //
  //   }

  //   // pass original event to parent
  //   // defaultProps.onDoubleClick?.(event)
  // }

  const handleTouchStart: ButtonProviderProps['onTouchStart'] = (event) => {
    touchdown = true
    // pass original event to parent
    defaultProps.onTouchStart?.(event)
  }

  /**
   * Touch devices do not trigger double click events, so we need to calculate the touch events directly to trigger double click events.
   * @param event
   * @returns
   */
  const handleTouchEnd: ButtonProviderProps['onTouchEnd'] = (event) => {
    // pass original event to parent
    defaultProps.onTouchEnd?.(event)

    // anchor use href to navigate
    if (defaultProps.type === 'anchor') {
      return
    }

    const _doubleClickGap = defaultProps.doubleClickGap
    const newClickTime = now()

    if (touchdown) {
      defaultProps.onClick?.(event)
    }

    if (touchdown && newClickTime - clickTime < _doubleClickGap) {
      defaultProps.onDoubleClick?.(event)

      return
    }

    touchdown = false
    clickTime = newClickTime
  }

  const href = createMemo(() => {
    switch (defaultProps.type) {
      case 'anchor': {
        return defaultProps.href
      }
    }
  })

  const tag = createMemo(() => {
    switch (defaultProps.type) {
      case 'anchor': {
        return 'a'
      }

      case 'anchor-button': {
        return 'a'
      }

      default: {
        return 'button'
      }
    }
  })

  const buttonContextValue = createMemo((): ButtonContextProps => {
    return {
      disabled: defaultProps.disabled ?? false,
      href: href(),
      tag: tag(),
    }
  })

  return (
    <ButtonContext.Provider
      value={[buttonContextValue, {handleClick, handleTouchEnd, handleTouchStart}]}
    >
      {props.children}
    </ButtonContext.Provider>
  )
}
