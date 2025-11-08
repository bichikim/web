import {DragListItemContext} from './DragListItemProvider'
import {
  Accessor,
  useContext,
  ValidComponent,
  type JSX,
  children,
  createSignal,
  createMemo,
  onCleanup,
  Show,
} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {useEvent} from '@winter-love/solid-use'
import {getWindow, getDocument} from '@winter-love/utils'
import {DragListContext} from './DragListProvider'
import {DragListGhostProvider} from './DragListGhostProvider'
import {createRenderGhost} from './render-ghost'

export type DragListItemProps<T extends ValidComponent> = Omit<DynamicProps<T>, 'children'> & {
  children: ((item: any, index: Accessor<number>) => JSX.Element) | JSX.Element
  ghost?: ((item: any, index: Accessor<number>) => JSX.Element) | JSX.Element
}

// todo 터치도 작동 되게
export const DragListItem = <T extends ValidComponent>(props: DragListItemProps<T>) => {
  const [mouseDown, setMouseDown] = createSignal(false)
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const context = useContext(DragListItemContext)

  const ghostChildren = children(() => {
    if (!context) {
      return null
    }

    if (typeof props.ghost === 'function') {
      return props.ghost(context?.value(), context?.index)
    }

    return props.ghost
  })

  const shouldRenderCloneGhost = createMemo(() => ghostChildren.toArray().length === 0)
  const renderGhost = createRenderGhost(shouldRenderCloneGhost)

  const listContext = useContext(DragListContext)
  const [isDragging, setIsDragging] = createSignal(false)

  const resolvedChildren = children(() => {
    if (!context) {
      return null
    }

    if (typeof props.children === 'function') {
      return props.children(context.value(), context.index)
    }

    return props.children
  })

  const handleDragStart = (event: MouseEvent) => {
    if (isDragging()) {
      return
    }

    renderGhost.create(event.target as HTMLElement, {x: event.offsetX, y: event.offsetY})
    context?.onDragStart(event)
  }

  const handleDrag = (event: MouseEvent) => {
    setIsDragging(true)
    // 포지션을 직접 넘겨주는데 상태변경으로 넘겨 주도록 해서 커스텀 엘리먼트와 함께 좌표 전달 가능하게
    renderGhost.update({x: event.clientX, y: event.clientY})
    context?.onDrag(event)
  }

  const handleDragEnd = (event: MouseEvent, itemElement: HTMLElement) => {
    console.log('handleDragEnd')
    const rect = itemElement.getBoundingClientRect()

    renderGhost.destroy(
      {
        duration: listContext?.duration() ?? 100,
        easing: listContext?.easing() ?? 'ease-in-out',
        position: {x: rect.x, y: rect.y},
      },
      () => {
        setIsDragging(false)
      },
    )
    context?.onDragEnd(event, itemElement)
  }

  const handleDragOver = (event: MouseEvent) => {
    context?.onDragOver(event)
  }

  const handlePointerDown = (event: MouseEvent) => {
    setMouseDown(true)
    handleDragStart(event)
  }

  const handlePointerMove = (event: MouseEvent) => {
    const _mouseDown = mouseDown()

    if (!_mouseDown) {
      return
    }

    handleDrag(event)
  }

  const handlePointerUp = (event: MouseEvent) => {
    setMouseDown(false)
    const _element = element()

    if (!_element) {
      return
    }

    handleDragEnd(event, _element)
  }

  const handleSelfOver = (event: MouseEvent) => {
    handleDragOver(event)
  }

  /**
   * drag 상태일 경우에 한해 전역 이벤트 등록을 위한 window 객체 제공
   */
  const globalTarget = createMemo(() => {
    return mouseDown() ? getWindow() : null
  })

  /**
   * drag 상태일 경우에 한해 pointermove 이벤트 구독
   */
  useEvent(globalTarget, 'pointermove', handlePointerMove)
  /**
   * drag 상태일 경우에 한해 pointerup 이벤트 구독
   */
  useEvent(globalTarget, 'pointerup', handlePointerUp)

  return (
    <Dynamic
      {...(props as any)}
      data-dragging={isDragging()}
      data-list-dragging={listContext?.draggingIndex() !== null}
      ref={setElement}
      onPointerUp={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerOver={handleSelfOver}
    >
      {resolvedChildren()}
      {/* 드레그 중 랜더링 포지션을 넘겨 줘야한다 */}
      <DragListGhostProvider
        duration={listContext?.duration() ?? 100}
        easing={listContext?.easing() ?? 'ease-in-out'}
        isDragging={isDragging()}
      >
        {ghostChildren()}
      </DragListGhostProvider>
    </Dynamic>
  )
}
