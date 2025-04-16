import {ComponentProps, createMemo, createSignal, splitProps, useContext} from 'solid-js'
import {ResizeCardContext, ResizeType} from './ResizeCardProvider'
import {useEvent} from '@winter-love/solid-use'
import {getWindow} from '@winter-love/utils'

export interface ResizeCardHandleProps extends ComponentProps<'button'> {
  resizeType: ResizeType
}

export const ResizeCardHandle = (props: ResizeCardHandleProps) => {
  const [innerProps, restProps] = splitProps(props, ['resizeType'])
  const [isStart, setIsStart] = createSignal(false)
  const {startResize, updateSize} = useContext(ResizeCardContext)

  const handleMouseDown: ResizeCardHandleProps['onMouseDown'] = (event: MouseEvent) => {
    setIsStart(true)

    startResize(
      {
        x: event.clientX,
        y: event.clientY,
      },
      innerProps.resizeType,
    )
    ;(props.onMouseDown as any)?.(event)
  }

  const handleTouchStart: ResizeCardHandleProps['onTouchStart'] = (event) => {
    setIsStart(true)

    startResize(
      {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      },
      innerProps.resizeType,
    )
    const _onTouchStart = props.onTouchStart

    if (typeof _onTouchStart === 'function') {
      _onTouchStart(event)
    }
  }

  const handleMouseMove = (event: MouseEvent) => {
    updateSize({
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleTouchMove = (event: TouchEvent) => {
    updateSize({
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    })
  }

  const handleTouchEnd = () => {
    setIsStart(false)
  }

  const handleMouseUp = () => {
    setIsStart(false)
  }

  const globalTarget = createMemo(() => (isStart() ? getWindow() : null))

  useEvent(globalTarget, 'mousemove', handleMouseMove)
  useEvent(globalTarget, 'mouseup', handleMouseUp)
  useEvent(globalTarget, 'touchmove', handleTouchMove)
  useEvent(globalTarget, 'touchend', handleTouchEnd)

  return (
    <button {...restProps} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>
      {restProps.children}
    </button>
  )
}
