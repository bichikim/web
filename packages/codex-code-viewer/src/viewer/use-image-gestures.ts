import {type Accessor, type JSX} from 'solid-js'
import type {useImageView} from './use-image-view'

interface UseImageGesturesProps {
  element: Accessor<HTMLDivElement | null>
  image: ReturnType<typeof useImageView>
}
const LINE_PIXELS = 16
const WHEEL_SENSITIVITY = 200
const ZOOM_STEP = 1.25
const ORIGINAL_PERCENT = 100

export const useImageGestures = (props: UseImageGesturesProps) => {
  const point = (event: MouseEvent | PointerEvent | WheelEvent) => {
    const rectangle = props.element()?.getBoundingClientRect()
    return {x: event.clientX - (rectangle?.left ?? 0), y: event.clientY - (rectangle?.top ?? 0)}
  }
  const handleDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.button !== 0 || (!props.image.pannable() && event.pointerType !== 'touch')) {
      return
    }
    if (props.image.begin(event.pointerId, point(event))) {
      event.preventDefault()
      event.currentTarget.focus({preventScroll: true})
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }
  const handleMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    props.image.move(event.pointerId, point(event))
  const handleEnd: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    props.image.end(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }
  const handleLost: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    props.image.end(event.pointerId)
  const handleWheel: JSX.EventHandler<HTMLDivElement, WheelEvent> = (event) => {
    const units =
      event.deltaMode === 1
        ? LINE_PIXELS
        : event.deltaMode === 2
          ? event.currentTarget.clientHeight
          : 1
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      props.image.zoom(
        props.image.percent() * Math.exp((-event.deltaY * units) / WHEEL_SENSITIVITY),
        point(event),
      )
    } else if (props.image.pan({x: -event.deltaX * units, y: -event.deltaY * units})) {
      event.preventDefault()
    }
  }
  const handleKeyboard: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    const STEP = 32
    switch (event.key) {
      case '+':
      case '=':
        props.image.zoom(props.image.percent() * ZOOM_STEP)
        break
      case '-':
        props.image.zoom(props.image.percent() / ZOOM_STEP)
        break
      case '0':
        props.image.zoom(ORIGINAL_PERCENT)
        break
      case 'Home':
        props.image.fit()
        break
      case 'ArrowLeft':
        if (!props.image.pan({x: STEP, y: 0})) {
          return
        }
        break
      case 'ArrowRight':
        if (!props.image.pan({x: -STEP, y: 0})) {
          return
        }
        break
      case 'ArrowUp':
        if (!props.image.pan({x: 0, y: STEP})) {
          return
        }
        break
      case 'ArrowDown':
        if (!props.image.pan({x: 0, y: -STEP})) {
          return
        }
        break
      default:
        return
    }
    event.preventDefault()
  }
  return {
    handleDown,
    handleEnd,
    handleKeyboard,
    handleLost,
    handleMove,
    handleWheel,
    zoomIn: () => props.image.zoom(props.image.percent() * ZOOM_STEP),
    zoomOut: () => props.image.zoom(props.image.percent() / ZOOM_STEP),
  }
}
