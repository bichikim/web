import {Position} from '@winter-love/utils'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  JSX,
  mergeProps,
  splitProps,
  useContext,
  ValidComponent,
} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {ELEMENT_IDENTIFIER_REAL_BUTTON_STATE} from 'src/components/real-button/HRealButton'
import {
  ELEMENT_IDENTIFIER_GLOBAL_TOUCH,
  useGlobalTouch,
} from 'src/components/real-button/use-global-touch'
import {DragContext} from './drag-context'

export interface DragProps extends JSX.HTMLAttributes<HTMLElement> {
  as?: ValidComponent
  onDown?: () => void
  onUp?: () => void
  parentPosition?: Position
  preventDrag?: boolean
}

export const Drag = (props: DragProps) => {
  const mergedProps = mergeProps({as: 'div'}, props)
  const [innerProps, restProps] = splitProps(mergedProps, [
    'as',
    'onDown',
    'onUp',
    'preventDrag',
    'parentPosition',
  ])

  const id = createUniqueId()
  const isDown = useGlobalTouch(id)
  const {parentPosition} = useContext(DragContext)
  const [rootElement, setRootElement] = createSignal<null | HTMLElement>(null)
  let mounted = false
  let oldDown = false
  let startPosition = {x: 0, y: 0}

  const updateStartPosition = (point: Position) => {
    const rect = rootElement()?.getBoundingClientRect()
    const rootPosition = rect ? {x: rect.left, y: rect.top} : {x: 0, y: 0}
    startPosition = {
      x: point.x - rootPosition.x,
      y: point.y - rootPosition.y,
    }
  }

  createEffect(() => {
    const downData = isDown()
    if (downData.down) {
      innerProps.onDown?.()
    } else if (mounted) {
      innerProps.onUp?.()
    }
    mounted = true
  })

  const attrs = createMemo(() => {
    const downData = isDown()
    if (downData.down && !oldDown && downData.point) {
      updateStartPosition(downData.point)
    }
    const _parentPosition = parentPosition() ?? {x: 0, y: 0}

    const x = (downData.point?.x ?? 0) - _parentPosition.x - startPosition.x
    const y = (downData.point?.y ?? 0) - _parentPosition.y - startPosition.y

    oldDown = downData.down

    return {
      [ELEMENT_IDENTIFIER_GLOBAL_TOUCH]: id,
      [ELEMENT_IDENTIFIER_REAL_BUTTON_STATE]: isDown().down ? 'down' : 'up',
      class: `select-none ${restProps.class}`,
      style: `top:${y}px; left:${x}px`,
    }
  })

  return (
    <Dynamic ref={setRootElement} {...restProps} {...attrs()} component={innerProps.as} />
  )
}
