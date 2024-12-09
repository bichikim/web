import {
  createEffect,
  createMemo,
  createUniqueId,
  type JSX,
  splitProps,
  ValidComponent,
} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {ELEMENT_IDENTIFIER_REAL_BUTTON_STATE} from 'src/components/real-button/HRealButton'
import {
  ELEMENT_IDENTIFIER_GLOBAL_TOUCH,
  useGlobalTouch,
} from 'src/components/real-button/use-global-touch'

export interface DragProps extends JSX.HTMLAttributes<HTMLElement> {
  as?: ValidComponent
  onDown?: () => void
  onUp?: () => void
}

export const Drag = (props: DragProps) => {
  const [eventProps, restProps] = splitProps(props, ['onDown', 'onUp'])
  const id = createUniqueId()
  const isDown = useGlobalTouch(id)
  let mounted = false

  createEffect(() => {
    if (isDown().down) {
      eventProps.onDown?.()
    } else if (mounted) {
      eventProps.onUp?.()
    }
    mounted = true
  })

  const attrs = createMemo(() => {
    return {
      [ELEMENT_IDENTIFIER_GLOBAL_TOUCH]: id,
      [ELEMENT_IDENTIFIER_REAL_BUTTON_STATE]: isDown().down ? 'down' : 'up',
      class: `select-none ${restProps.class}`,
      style: `x:${isDown().point?.x ?? ''}px; y:${isDown().point?.y ?? ''}px`,
    }
  })

  return <Dynamic {...restProps} {...attrs()} component={props.as} />
}
