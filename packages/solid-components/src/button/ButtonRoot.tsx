import {createMemo, createSignal, JSX, mergeProps, ParentProps} from 'solid-js'
import {ButtonContext, ButtonContextProps, ButtonContextValue} from './context'
import {useDoubleClick} from './double-click'

export type ButtonType = 'button' | 'anchor' | 'anchor-button'

export interface ButtonRootProps extends ParentProps {
  as?: keyof JSX.IntrinsicElements
  /**
   * If true, the button will change to loading state when clicked.
   */
  autoLoading?: boolean
  disabled?: boolean
  doubleClickGap?: number
  href?: string
  loading?: boolean | number
  onClick?: (event: MouseEvent | TouchEvent) => Promise<void> | void
  onDoubleClick?: (event: MouseEvent | TouchEvent) => Promise<void> | void
  onTouchEnd?: (event: TouchEvent) => void
  onTouchStart?: (event: TouchEvent) => void
  preventLoadingDisabled?: boolean
  type?: ButtonType
}

const DEFAULT_DOUBLE_CLICK_GAP = 250

export const ButtonRoot = (props: ButtonRootProps) => {
  const defaultProps = mergeProps(
    {
      autoLoading: false,
      doubleClickGap: DEFAULT_DOUBLE_CLICK_GAP,
      loading: false,
      type: 'button',
    },
    props,
  )

  const {handleClick, handleTouchEnd, handleTouchStart} = useDoubleClick(() => ({
    // anchor use href to navigate
    active: defaultProps.type !== 'anchor',
    doubleClickGap: defaultProps.doubleClickGap,
    onClick: defaultProps.onClick,
    onDoubleClick: defaultProps.onDoubleClick,
    onLoading: (value: boolean) => {
      setAutoLoading(value)
    },
    onTouchEnd: defaultProps.onTouchEnd,
    onTouchStart: defaultProps.onTouchStart,
  }))

  /**
   * number: loading process percentage
   * boolean: auto loading state
   */
  const [autoLoading, setAutoLoading] = createSignal<number | boolean>(false)

  const href = createMemo(() => {
    if (defaultProps.as === 'a' || defaultProps.type === 'anchor') {
      return defaultProps.href
    }
  })

  const tag = createMemo(() => {
    if (defaultProps.as) {
      return defaultProps.as
    }

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
