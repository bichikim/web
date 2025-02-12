import {Accessor, createContext, createMemo, JSX, mergeProps, ParentProps} from 'solid-js'
import {now} from '@winter-love/lodash'
import {} from 'solid-js/web'

export type ButtonType = 'button' | 'anchor' | 'anchor-button'
export type ButtonTag = 'button' | 'a'

export interface ButtonContextProps {
  disabled: boolean
  href?: string
  tag: ButtonTag
}

export interface ButtonContextActions {
  handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  handleDoubleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  handleTouchEnd: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  handleTouchStart: JSX.EventHandler<HTMLButtonElement, TouchEvent>
}

export const ButtonContext = createContext<
  [Accessor<ButtonContextProps>, ButtonContextActions]
>([
  () => ({disabled: false, tag: 'button' as const}),
  {
    handleClick: () => {
      throw new Error('not implemented')
    },
    handleDoubleClick: () => {
      throw new Error('not implemented')
    },
    handleTouchEnd: () => {
      throw new Error('not implemented')
    },
    handleTouchStart: () => {
      throw new Error('not implemented')
    },
  },
])

export interface ButtonRootProps extends ParentProps {
  disabled?: boolean
  doubleClickGap?: number
  href?: string
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onDoubleClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onTouchEnd?: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  onTouchStart?: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  type?: ButtonType
}

const DEFAULT_DOUBLE_CLICK_GAP = 250

export const ButtonRoot = (props: ButtonRootProps) => {
  // Previous click time used to check if current click is a double click
  let clickTime = 0
  let touchdown = false

  const defaultProps = mergeProps(
    {
      type: 'button',
    },
    props,
  )

  /**
   * Handles the `click` event for the button component and forwards it to the parent component.
   *
   * @param event The mouse event triggered by user interaction.
   */
  const handleClick: ButtonRootProps['onClick'] = (event: any) => {
    // skip touch event
    // skip anchor event because it will navigate to the href
    if (event.pointerType === 'touch' || defaultProps.type === 'anchor') {
      return
    }

    defaultProps.onClick?.(event)
  }

  /**
   * Handles the `doubleClick` event for the button component and forwards it to the parent component.
   * @param event The mouse event triggered by user interaction.
   */
  const handleDoubleClick: ButtonRootProps['onDoubleClick'] = (event) => {
    // skip anchor event because it will navigate to the href
    if (defaultProps.type === 'anchor') {
      return
    }

    // pass original event to parent
    defaultProps.onDoubleClick?.(event)
  }

  const handleTouchStart: ButtonRootProps['onTouchStart'] = (event) => {
    touchdown = true
    // pass original event to parent
    defaultProps.onTouchStart?.(event)
  }

  /**
   * Touch devices do not trigger double click events, so we need to calculate the touch events directly to trigger double click events.
   * @param event
   * @returns
   */
  const handleTouchEnd: ButtonRootProps['onTouchEnd'] = (event) => {
    // pass original event to parent
    defaultProps.onTouchEnd?.(event)

    // anchor use href to navigate
    if (defaultProps.type === 'anchor') {
      return
    }

    const doubleClickGap = defaultProps.doubleClickGap ?? DEFAULT_DOUBLE_CLICK_GAP
    const newClickTime = now()

    if (touchdown) {
      defaultProps.onClick?.(event)
      touchdown = false
    }

    if (newClickTime - clickTime < doubleClickGap) {
      handleDoubleClick(event)

      return
    }

    clickTime = newClickTime
  }

  const href = createMemo(() => {
    switch (defaultProps.type) {
      case 'anchor': {
        return defaultProps.href
      }

      default: {
        return ''
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
      value={[
        buttonContextValue,
        {handleClick, handleDoubleClick, handleTouchEnd, handleTouchStart},
      ]}
    >
      {props.children}
    </ButtonContext.Provider>
  )
}
