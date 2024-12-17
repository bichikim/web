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
  useGlobalDown,
  useGlobalDragPoint,
} from 'src/components/real-button/use-global-touch'
import {DragContext} from './drag-context'

export interface HDragProps extends JSX.HTMLAttributes<HTMLElement> {
  as?: ValidComponent
  onDown?: () => void
  onUp?: () => void
  parentPosition?: Position
  preventDrag?: boolean
}

export const HDrag = (props: HDragProps) => {
  const mergedProps = mergeProps({as: 'div'}, props)
  const [innerProps, restProps] = splitProps(mergedProps, [
    'as',
    'onDown',
    'onUp',
    'preventDrag',
    'parentPosition',
  ])

  const id = createUniqueId()
  const isDown = useGlobalDown(id)
  const dragPoint = useGlobalDragPoint(id)
  const {parentPosition} = useContext(DragContext)
  const [rootElement, setRootElement] = createSignal<null | HTMLElement>(null)
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
    if (isDown()) {
      innerProps.onDown?.()
    } else {
      innerProps.onUp?.()
    }
  })

  const attrs = createMemo(() => {
    const down = isDown()
    const pointState = dragPoint()
    if (down && pointState.state === 'start' && pointState.point) {
      updateStartPosition(pointState.point)
    }
    const _parentPosition = parentPosition() ?? {x: 0, y: 0}

    const x = (pointState.point?.x ?? 0) - _parentPosition.x - startPosition.x
    const y = (pointState.point?.y ?? 0) - _parentPosition.y - startPosition.y

    return {
      [ELEMENT_IDENTIFIER_GLOBAL_TOUCH]: id,
      [ELEMENT_IDENTIFIER_REAL_BUTTON_STATE]: down ? 'down' : 'up',
      class: `select-none ${restProps.class}`,
      style: `top:${y}px; left:${x}px`,
    }
  })

  return (
    <Dynamic ref={setRootElement} {...restProps} {...attrs()} component={innerProps.as} />
  )
}
