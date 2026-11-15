import {type Accessor, createSignal} from 'solid-js'
import type {CameraGesture} from './camera'

interface UseCameraGesturesProps {
  readonly viewport: Accessor<HTMLDivElement | null>
  readonly onTransform: (from: CameraGesture, to: CameraGesture) => void
  readonly onLeave: () => void
  readonly onReset: () => void
}

interface PointerPosition {
  readonly x: number
  readonly y: number
}

const getGesture = (pointers: ReadonlyMap<number, PointerPosition>): CameraGesture => {
  const [first, second] = [...pointers.values()]
  if (first === undefined) {
    return {span: 0, x: 0, y: 0}
  }
  return second === undefined
    ? {...first, span: 0}
    : {
        span: Math.hypot(second.x - first.x, second.y - first.y),
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      }
}

export const useCameraGestures = (props: UseCameraGesturesProps) => {
  const pointers = new Map<number, PointerPosition>()
  const [dragging, setDragging] = createSignal(false)
  const zoom = (factor: number) => {
    const viewport = props.viewport()
    const point = {x: (viewport?.clientWidth ?? 0) / 2, y: (viewport?.clientHeight ?? 0) / 2}
    props.onTransform({...point, span: 1}, {...point, span: factor})
  }
  const ZOOM_STEP = 1.25
  const zoomIn = () => zoom(ZOOM_STEP)
  const zoomOut = () => zoom(1 / ZOOM_STEP)

  const getPoint = (event: MouseEvent): PointerPosition => {
    const bounds = props.viewport()?.getBoundingClientRect()
    return {x: event.clientX - (bounds?.left ?? 0), y: event.clientY - (bounds?.top ?? 0)}
  }

  const handlePointerDown = (event: PointerEvent) => {
    const viewport = props.viewport()
    if (viewport === null || (event.button !== 0 && event.button !== 1)) {
      return
    }
    event.preventDefault()
    viewport.focus({preventScroll: true})
    viewport.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, getPoint(event))
    setDragging(true)
    props.onLeave()
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (pointers.has(event.pointerId)) {
      const from = getGesture(pointers)
      pointers.set(event.pointerId, getPoint(event))
      props.onTransform(from, getGesture(pointers))
    }
  }

  const handlePointerEnd = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    setDragging(pointers.size > 0)
    const viewport = props.viewport()
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId)
    }
  }

  const handleLeave = () => props.onLeave()

  const handleBlur = () => {
    pointers.clear()
    setDragging(false)
    handleLeave()
  }

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()
    const LINE_PIXELS = 16
    const WHEEL_SCALE = 0.002
    const unit =
      event.deltaMode === 1
        ? LINE_PIXELS
        : event.deltaMode === 2
          ? (props.viewport()?.clientHeight ?? 0)
          : 1
    const point = getPoint(event)
    props.onTransform(
      {...point, span: 1},
      {...point, span: Math.exp(-event.deltaY * unit * WHEEL_SCALE)},
    )
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const MOVE_DISTANCE = 40
    const move = (x: number, y: number) => props.onTransform({span: 0, x: 0, y: 0}, {span: 0, x, y})
    switch (event.key) {
      case 'ArrowLeft':
        move(-MOVE_DISTANCE, 0)
        break
      case 'ArrowRight':
        move(MOVE_DISTANCE, 0)
        break
      case 'ArrowUp':
        move(0, -MOVE_DISTANCE)
        break
      case 'ArrowDown':
        move(0, MOVE_DISTANCE)
        break
      case '+':
      case '=':
        zoomIn()
        break
      case '-':
        zoomOut()
        break
      case '0':
      case 'Home':
        props.onReset()
        break
      default:
        return
    }
    event.preventDefault()
  }

  return {
    dragging,
    handleBlur,
    handleKeyDown,
    handleLeave,
    handlePointerDown,
    handlePointerEnd,
    handlePointerMove,
    handleWheel,
    zoomIn,
    zoomOut,
  }
}
