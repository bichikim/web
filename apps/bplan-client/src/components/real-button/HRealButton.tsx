import {
  Accessor,
  Component,
  createContext,
  createEffect,
  createMemo,
  createUniqueId,
  JSX,
  ParentProps,
  splitProps,
} from 'solid-js'
import {ELEMENT_IDENTIFIER_GLOBAL_TOUCH, useGlobalDown} from './use-global-touch'
import {DownEventPayload} from './types'

export interface HRealButtonAsProps {
  isDown: boolean
}

export const KeyDownContext = createContext<Accessor<DownEventPayload>>(() => ({
  down: false,
  renderOnly: false,
}))

export interface HRealButtonProps extends ParentProps {
  /**
   *
   */
  as?: Component<HRealButtonAsProps>
}

export const ELEMENT_IDENTIFIER_REAL_BUTTON_STATE = 'data-state'

export interface HRealButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'id'> {
  id?: string | number
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
    'id',
  ])
  const id = createUniqueId()

  const targetId = `${innerProps.id ?? id}`
  const isDown = useGlobalDown(targetId)
  let mounted = false

  createEffect(() => {
    mounted = true
    const downState = isDown()

    if (downState.renderOnly) {
      return
    }

    if (downState.down) {
      innerProps.onDown?.()
    } else if (mounted) {
      innerProps.onUp?.()
    }
  })

  const attrs = createMemo(() => {
    const down = isDown().down || innerProps.renderDown

    return {
      [ELEMENT_IDENTIFIER_GLOBAL_TOUCH]: targetId,
      [ELEMENT_IDENTIFIER_REAL_BUTTON_STATE]: down ? 'down' : 'up',
      'aria-pressed': down,
      class: `select-none ${innerProps.class}`,
    }
  })

  return (
    <KeyDownContext.Provider value={isDown}>
      <button
        {...restProps}
        {...attrs()}
        on:pointerup={{capture: true, handleEvent: (event) => event.preventDefault()}}
      >
        {props.children}
      </button>
    </KeyDownContext.Provider>
  )
}
