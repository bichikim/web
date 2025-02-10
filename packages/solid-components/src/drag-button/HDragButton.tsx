import {getWindow, Position} from '@winter-love/utils'
import {cx} from 'class-variance-authority'
import {children, createMemo, createSignal, JSX, Show, splitProps} from 'solid-js'
import {useEvent} from '@winter-love/solid-use'
import {HButton, HButtonProps} from 'src/button'

export interface HDragButtonProps extends Omit<HButtonProps, 'onClick'> {
  containerClass?: string
  dragEndSize?: number
  dragExecuteSize?: number
  dragLeftChildren?: JSX.Element
  dragRightChildren?: JSX.Element
  onClick?: (event: MouseEvent | TouchEvent) => void
  onDoubleClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  onLeftExecute?: () => void
  onRightExecute?: () => void
}

const findTouch = (list: TouchList, identifier: number) => {
  for (const item of list) {
    if (item.identifier === identifier) {
      return item
    }
  }
}

interface StartData {
  identifier: number
  x: number
  y: number
}

interface DragData {
  current?: Position
  started: StartData
}

// eslint-disable-next-line max-lines-per-function
export const HDragButton = (props: HDragButtonProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'class',
    'containerClass',
    'onClick',
    'dragExecuteSize',
    'dragEndSize',
    'dragLeftChildren',
    'onLeftExecute',
    'onRightExecute',
    'onDoubleClick',
  ])
  const leftChildren = children(() => props.dragLeftChildren)
  const rightChildren = children(() => props.dragRightChildren)
  const [drag, setDrag] = createSignal<DragData>({started: {identifier: -1, x: 0, y: 0}})
  const hasLeft = createMemo(() => Boolean(innerProps.onLeftExecute))
  const hasRight = createMemo(() => Boolean(innerProps.onRightExecute))

  const dragX = createMemo(() => {
    const {current} = drag()
    let x = current?.x ?? 0
    const _dragEndSize = innerProps.dragEndSize

    if (!_dragEndSize) {
      return 0
    }

    if (_dragEndSize < x) {
      x = _dragEndSize
    } else if (x < _dragEndSize * -1) {
      x = _dragEndSize * -1
    }

    if ((x > 0 && hasLeft()) || (x < 0 && hasRight())) {
      return x
    }

    return 0
  })

  const handleClick = (event: MouseEvent | TouchEvent) => {
    innerProps.onClick?.(event)
  }

  const handleLeftExecute = () => {
    innerProps.onLeftExecute?.()
  }

  const handleRightExecute = () => {
    innerProps.onRightExecute?.()
  }

  const handleStart = (data: StartData) => {
    setDrag({
      current: undefined,
      started: data,
    })
  }

  const handleMouseDown = (event: MouseEvent) => {
    handleStart({
      identifier: 999_999,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleTouchStart = (event: TouchEvent) => {
    const [touch] = event.touches

    if (touch) {
      handleStart({
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
      })
    }
  }

  const handleMove = (data: Position) => {
    setDrag((prev) => ({
      ...prev,
      current: {
        x: data.x,
        y: data.y,
      },
    }))
  }

  const handleMouseMove = (event: MouseEvent) => {
    const {
      started: {identifier, x, y},
    } = drag()

    if (identifier === -1) {
      return
    }

    handleMove({
      x: event.clientX - x,
      y: event.clientY - y,
    })
  }

  const handleTouchMove = (event: TouchEvent) => {
    const {
      started: {identifier, x, y},
    } = drag()
    const item = findTouch(event.changedTouches, identifier)

    if (!item) {
      return
    }

    handleMove({
      x: item.clientX - x,
      y: item.clientY - y,
    })
  }

  const handleEnd = (event: MouseEvent | TouchEvent, data?: Position) => {
    setDrag({
      current: undefined,
      started: {identifier: -1, x: 0, y: 0},
    })

    if (!data) {
      return
    }

    const {x} = data
    const _dragExecuteSize = innerProps.dragExecuteSize

    if (!_dragExecuteSize) {
      return
    }

    if (x > _dragExecuteSize) {
      handleLeftExecute()
    } else if (x < _dragExecuteSize * -1) {
      handleRightExecute()
    } else {
      innerProps.onClick?.(event)
    }
  }

  const handleMouseUp = (event: MouseEvent) => {
    const {
      started: {x, y},
    } = drag()

    handleEnd(event, {
      x: event.clientX - x,
      y: event.clientY - y,
    })
  }

  const handleTouchEnd = (event: TouchEvent) => {
    const {
      started: {identifier, x, y},
    } = drag()

    if (identifier === -1) {
      return
    }

    const item = findTouch(event.changedTouches, identifier)

    if (!item) {
      return handleEnd(event)
    }

    const {clientX, clientY} = item
    const draggedX = clientX - x
    const draggedY = clientY - y

    handleEnd(event, {
      x: draggedX,
      y: draggedY,
    })
  }

  const identifier = createMemo(() => drag().started.identifier)

  const endElement = createMemo(() => {
    const window = getWindow()
    const _identifier = identifier()

    if (!window) {
      return null
    }

    if (_identifier === -1) {
      return null
    }

    return window
  })

  useEvent(endElement, 'touchend', handleTouchEnd)
  useEvent(endElement, 'mouseup', handleMouseUp)

  return (
    <HButton
      {...restProps}
      class={cx('flex relative', innerProps.class)}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      onDoubleClick={innerProps.onDoubleClick}
    >
      <Show when={dragX() > 0}>
        <span
          class="block h-full absolute overflow-hidden"
          style={{width: `${dragX()}px`}}
        >
          {leftChildren()}
        </span>
      </Show>
      <span
        class={cx(
          'flex w-full h-full items-center absolute box-border left-0 top-0',
          innerProps.containerClass,
        )}
        style={{left: `${dragX()}px`}}
      >
        {props.children}
      </span>
      <Show when={dragX() < 0}>
        <span
          class="block h-full absolute overflow-hidden right-0 top-0"
          style={{width: `${dragX() * -1}px`}}
        >
          {rightChildren()}
        </span>
      </Show>
    </HButton>
  )
}
