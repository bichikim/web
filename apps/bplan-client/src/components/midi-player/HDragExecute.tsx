import {Position} from '@winter-love/utils'
import {cx} from 'class-variance-authority'
import {children, createMemo, createSignal, JSX, splitProps} from 'solid-js'

export interface HDragExecuteProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'onClick'> {
  containerClass?: string
  dragEndSize?: number
  dragExecuteSize?: number
  dragLeftChildren?: JSX.Element
  onClick?: (event: MouseEvent | TouchEvent) => void
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
export const HDragExecute = (props: HDragExecuteProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'class',
    'containerClass',
    'onClick',
    'dragExecuteSize',
    'dragEndSize',
    'dragLeftChildren',
    'onLeftExecute',
    'onRightExecute',
  ])
  const resolved = children(() => props.dragLeftChildren)
  const [drag, setDrag] = createSignal<DragData>({started: {identifier: -1, x: 0, y: 0}})
  const hasLeft = createMemo(() => Boolean(innerProps.onLeftExecute))
  const hasRight = createMemo(() => Boolean(innerProps.onRightExecute))
  const dragX = createMemo(() => {
    const {current} = drag()
    let x = current?.x ?? 0
    const _dragEndSize = innerProps.dragEndSize

    if (!_dragEndSize) {
      return '0px'
    }

    if (_dragEndSize < x) {
      x = _dragEndSize
    } else if (x < _dragEndSize * -1) {
      x = _dragEndSize * -1
    }

    if ((x > 0 && hasLeft()) || (x < 0 && hasRight())) {
      return `${x}px`
    }

    return '0px'
  })

  const handleClick = (event: MouseEvent) => {
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

  // useEvent(getWindow, 'onTouchEnd', handleTouchEnd)

  return (
    <button
      {...restProps}
      class={cx('flex relative', innerProps.class)}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <span class="block h-full absolute overflow-hidden" style={{width: dragX()}}>
        {resolved()}
      </span>
      <span
        class={cx(
          'flex w-full h-full items-center absolute box-border',
          innerProps.containerClass,
        )}
        style={{left: dragX()}}
      >
        {props.children}
      </span>
    </button>
  )
}
