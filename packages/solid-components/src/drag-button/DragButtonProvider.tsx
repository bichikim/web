import {Button, ButtonRootProps} from '../button'
import {createMemo, mergeProps, splitProps} from 'solid-js'
import {Position} from '@winter-love/utils'
import {DragButtonContext, DragButtonContextProps} from './context'
import {useDrag} from './drag'

export interface DragButtonProviderProps extends Omit<ButtonRootProps, 'onClick'> {
  allowBottom?: boolean
  allowTop?: boolean
  clickAllowMoveSize?: number
  dragEndSize?: number
  dragExecuteSize?: number
  onClick?: (event: MouseEvent | TouchEvent) => void
  onLeftExecute?: () => void
  onRightExecute?: () => void
  preventLeft?: boolean
  preventRight?: boolean
}

const getExecutePosition = (
  position: Position,
  options: Pick<DragButtonProviderProps, 'allowBottom' | 'allowTop' | 'preventLeft' | 'preventRight'>,
) => {
  let {x, y} = position
  const {allowBottom, allowTop, preventLeft, preventRight} = options

  if (x > 0 && preventLeft) {
    x = 0
  } else if (x < 0 && preventRight) {
    x = 0
  }

  if (y > 0 && !allowTop) {
    y = 0
  } else if (y < 0 && allowBottom) {
    y = 0
  }

  return {x, y}
}

export const DragButtonProvider = (props: DragButtonProviderProps) => {
  const defaultProps = mergeProps({clickAllowMoveSize: 10, dragEndSize: 50, dragExecuteSize: 50}, props)

  const [innerProps, restProps] = splitProps(defaultProps, [
    'dragExecuteSize',
    'dragEndSize',
    'onLeftExecute',
    'onRightExecute',
    'onClick',
    'preventLeft',
    'preventRight',
    'allowBottom',
    'allowTop',
    'clickAllowMoveSize',
  ])

  const handleEnd = (event: MouseEvent | TouchEvent, data: Position) => {
    const {x} = getExecutePosition(data, {
      allowBottom: innerProps.allowBottom,
      allowTop: innerProps.allowTop,
      preventLeft: innerProps.preventLeft,
      preventRight: innerProps.preventRight,
    })

    const _dragExecuteSize = innerProps.dragExecuteSize

    if (!_dragExecuteSize) {
      return
    }

    if (x > _dragExecuteSize) {
      handleLeftExecute()
    } else if (x < _dragExecuteSize * -1) {
      handleRightExecute()
    } else {
      handleClick(event)
    }
  }

  const [dragPosition, {handleMouseDown, handleTouchStart}] = useDrag(() => ({
    clickAllowMoveSize: innerProps.clickAllowMoveSize,
    dragEndSize: innerProps.dragEndSize,
    dragExecuteSize: innerProps.dragExecuteSize,
    onEnd: handleEnd,
  }))

  const handleClick = (event: MouseEvent | TouchEvent) => {
    const dragX = Math.abs(dragPosition().x)
    const dragY = Math.abs(dragPosition().y)

    if (dragX < innerProps.clickAllowMoveSize && dragY < innerProps.clickAllowMoveSize) {
      innerProps.onClick?.(event)
    }
  }

  const handleLeftExecute = () => {
    innerProps.onLeftExecute?.()
  }

  const handleRightExecute = () => {
    innerProps.onRightExecute?.()
  }

  const contextValue = createMemo((): DragButtonContextProps => {
    const {x, y} = getExecutePosition(dragPosition(), {
      allowBottom: innerProps.allowBottom,
      allowTop: innerProps.allowTop,
      preventLeft: innerProps.preventLeft,
      preventRight: innerProps.preventRight,
    })

    return {
      dragX: x,
      dragY: y,
    }
  })

  return (
    <DragButtonContext.Provider
      value={[
        contextValue,
        {
          handleMouseDown,
          handleTouchStart,
        },
      ]}
    >
      <Button.Root {...restProps} onTouchStart={handleTouchStart}>
        {props.children}
      </Button.Root>
    </DragButtonContext.Provider>
  )
}
