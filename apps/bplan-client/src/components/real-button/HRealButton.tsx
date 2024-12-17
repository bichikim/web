import {
  Component,
  createEffect,
  createMemo,
  createUniqueId,
  JSX,
  ParentProps,
  splitProps,
} from 'solid-js'
import {ELEMENT_IDENTIFIER_GLOBAL_TOUCH, useGlobalDown} from './use-global-touch'

export interface HRealButtonAsProps {
  isDown: boolean
}

export interface HRealButtonProps extends ParentProps {
  /**
   *
   */
  as?: Component<HRealButtonAsProps>
}

export const ELEMENT_IDENTIFIER_REAL_BUTTON_STATE = 'data-state'

export interface HRealButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  onDown?: () => void
  onUp?: () => void
  renderDown?: boolean
}

/**
 * A component that behaves like a physical button in the real world
 * If you press it with your finger, it will be pressed, and if your finger leaves the button while it is pressed, the button will not be pressed
 * If you press and hold your finger and move your finger to enter the button, the button will be pressed
 */
export const HRealButton = (props: HRealButtonProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'onDown',
    'onUp',
    'renderDown',
    'class',
  ])
  const id = createUniqueId()
  const isDown = useGlobalDown(id)
  let mounted = false

  createEffect(() => {
    if (isDown()) {
      innerProps.onDown?.()
    } else if (mounted) {
      innerProps.onUp?.()
    }
    mounted = true
  })

  const attrs = createMemo(() => {
    const down = isDown() || innerProps.renderDown
    return {
      [ELEMENT_IDENTIFIER_GLOBAL_TOUCH]: id,
      [ELEMENT_IDENTIFIER_REAL_BUTTON_STATE]: down ? 'down' : 'up',
      'aria-pressed': down,
      class: `select-none ${innerProps.class}`,
    }
  })

  return (
    <button
      {...restProps}
      {...attrs()}
      on:pointerup={{capture: true, handleEvent: (event) => event.preventDefault()}}
    >
      {props.children}
    </button>
  )
}
