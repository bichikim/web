import {createMemo, createSignal, JSX, mergeProps, ParentProps} from 'solid-js'
import {now} from '@winter-love/lodash'
import {ButtonContext, ButtonContextProps, ButtonContextValue} from './context'

export type ButtonType = 'button' | 'anchor' | 'anchor-button'

export interface ButtonRootProps extends ParentProps {
  /**
   * If true, the button will change to loading state when clicked.
   */
  autoLoading?: boolean
  disabled?: boolean
  doubleClickGap?: number
  href?: string
  loading?: boolean | number
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onDoubleClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onFocusEnter?: (event: KeyboardEvent) => void
  onTouchEnd?: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  onTouchStart?: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  preventLoadingDisabled?: boolean
  type?: ButtonType
}

const DEFAULT_DOUBLE_CLICK_GAP = 250

export const ButtonRoot = (props: ButtonRootProps) => {
  // Previous click time used to check if current click is a double click
  let clickTime = 0
  let touchdown = false

  const defaultProps = mergeProps(
    {
      autoLoading: false,
      doubleClickGap: DEFAULT_DOUBLE_CLICK_GAP,
      loading: false,
      type: 'button',
    },
    props,
  )

  /**
   * number: loading process percentage
   * boolean: auto loading state
   */
  const [autoLoading, setAutoLoading] = createSignal<number | boolean>(false)

  /**
   * Handles the `click` event for the button component and forwards it to the parent component.
   *
   * @param event The mouse event triggered by user interaction.
   */
  const handleClick: ButtonRootProps['onClick'] = async (event: any) => {
    console.log('handleClick', event)

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
    setAutoLoading(true)
    await defaultProps.onClick?.(event)
    setAutoLoading(false)
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

  const loadingProcess = createMemo(() => {
    if (defaultProps.autoLoading) {
      return
    }

    if (typeof defaultProps.loading === 'number') {
      return defaultProps.loading
    }
  })

  const loading = createMemo(() => {
    if (defaultProps.autoLoading) {
      return autoLoading() ? 'true' : 'false'
    }

    if (typeof defaultProps.loading === 'number') {
      return 'true'
    }

    return defaultProps.loading ? 'true' : 'false'
  })

  const loadingAnimation = createMemo(() => {
    if (defaultProps.autoLoading) {
      return autoLoading() ? 'true' : 'false'
    }

    if (typeof defaultProps.loading === 'number') {
      return 'false'
    }

    return defaultProps.loading ? 'true' : 'false'
  })

  const disabled = createMemo(() => {
    if (defaultProps.preventLoadingDisabled) {
      return defaultProps.disabled ?? false
    }

    return (loading() !== 'false' || defaultProps.disabled) ?? false
  })

  const value = createMemo((): ButtonContextValue => {
    return {
      disabled: disabled(),
      href: href(),
      loading: loading(),
      loadingAnimation: loadingAnimation(),
      loadingProcess: loadingProcess(),
      tag: tag(),
    }
  })

  const context: ButtonContextProps = {handleClick, handleTouchEnd, handleTouchStart, value}

  return <ButtonContext.Provider value={context}>{props.children}</ButtonContext.Provider>
}
