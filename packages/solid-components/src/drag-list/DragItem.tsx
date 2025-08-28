import {DragListItemContext} from './DragListItemProvider'
import {Accessor, useContext, ValidComponent, type JSX, children, createSignal, createMemo} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {useEvent} from '@winter-love/solid-use'
import {getWindow} from '@winter-love/utils'

export type DragItemProps<T extends ValidComponent> = Omit<DynamicProps<T>, 'children'> & {
  children: ((item: any, index: Accessor<number>) => JSX.Element) | JSX.Element
}

export const DragItem = <T extends ValidComponent>(props: DragItemProps<T>) => {
  const [mouseDown, setMouseDown] = createSignal(false)
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const context = useContext(DragListItemContext)

  const resolvedChildren = children(() => {
    if (!context) {
      return null
    }

    if (typeof props.children === 'function') {
      return props.children(context.value(), context.index)
    }

    return props.children
  })

  const handlePointerDown = (event: MouseEvent) => {
    setMouseDown(true)
    context?.onDragStart(event)
  }

  const handlePointerUp = (event: MouseEvent) => {
    setMouseDown(false)
    const _element = element()

    if (_element) {
      context?.onDragEnd(event, _element)
    }
  }

  const handlePointerMove = (event: MouseEvent) => {
    const _mouseDown = mouseDown()

    if (!_mouseDown) {
      return
    }

    context?.onDrag(event)
  }

  const globalTarget = createMemo(() => {
    return mouseDown() ? getWindow() : null
  })

  useEvent(globalTarget, 'pointermove', handlePointerMove)
  useEvent(globalTarget, 'pointerup', handlePointerUp)

  const handleSelfOver = (event: MouseEvent) => {
    context?.onDragOver(event)
  }

  return (
    <Dynamic
      {...(props as any)}
      data-dragging={context?.isDragging()}
      ref={setElement}
      onDragStart={context?.onDragStart}
      onDragOver={context?.onDragOver}
      onDragEnd={context?.onDragEnd}
      onDrag={context?.onDrag}
      onPointerUp={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerOver={handleSelfOver}
    >
      {resolvedChildren()}
    </Dynamic>
  )
}
