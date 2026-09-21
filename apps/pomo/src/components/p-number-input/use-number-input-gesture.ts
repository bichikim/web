import {type Accessor, createSignal, type JSX, onCleanup} from 'solid-js'

const DRAG_INTENT_DISTANCE = 6
const PIXELS_PER_STEP = 8

export interface NumberInputRange {
  readonly max: number | undefined
  readonly min: number | undefined
}

export interface UseNumberInputGestureProps {
  readonly getRange: () => NumberInputRange
  readonly getStep: () => number
  readonly getValue: () => number
  readonly onValueChange: (value: number) => void
}

export interface NumberInputGesture {
  readonly dragging: Accessor<boolean>
  readonly handleClick: JSX.EventHandler<HTMLInputElement, MouseEvent>
  readonly handleLostPointerCapture: JSX.EventHandler<HTMLInputElement, PointerEvent>
  readonly handlePointerCancel: JSX.EventHandler<HTMLInputElement, PointerEvent>
  readonly handlePointerDown: JSX.EventHandler<HTMLInputElement, PointerEvent>
  readonly handlePointerMove: JSX.EventHandler<HTMLInputElement, PointerEvent>
  readonly handlePointerUp: JSX.EventHandler<HTMLInputElement, PointerEvent>
}

interface DragState {
  readonly pointerId: number
  readonly startValue: number
  readonly startX: number
  dragged: boolean
}

interface DragCalculation {
  readonly clientX: number
  readonly left: number
  readonly range: NumberInputRange
  readonly startValue: number
  readonly startX: number
  readonly step: number
  readonly width: number
}

const clamp = (value: number, min: number | undefined, max: number | undefined): number => {
  const lowerBoundedValue = min === undefined ? value : Math.max(value, min)
  return max === undefined ? lowerBoundedValue : Math.min(lowerBoundedValue, max)
}

const getDraggedValue = ({
  clientX,
  left,
  range,
  startValue,
  startX,
  step,
  width,
}: DragCalculation): number => {
  if (range.min !== undefined && range.max !== undefined) {
    if (range.min === range.max) {
      return range.min
    }

    const ratio = clamp((clientX - left) / width, 0, 1)
    return range.min + (range.max - range.min) * ratio
  }

  return startValue + Math.round((clientX - startX) / PIXELS_PER_STEP) * step
}

const releasePointer = (element: HTMLInputElement, pointerId: number) => {
  if (element.hasPointerCapture?.(pointerId)) {
    element.releasePointerCapture?.(pointerId)
  }
}

export const useNumberInputGesture = (props: UseNumberInputGestureProps): NumberInputGesture => {
  const [dragging, setDragging] = createSignal(false)
  let dragState: DragState | undefined
  let suppressClick = false

  const handlePointerDown: JSX.EventHandler<HTMLInputElement, PointerEvent> = (event) => {
    if (event.button !== 0) {
      return
    }

    dragState = {
      dragged: false,
      pointerId: event.pointerId,
      startValue: props.getValue(),
      startX: event.clientX,
    }
    setDragging(false)
    suppressClick = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const handlePointerMove: JSX.EventHandler<HTMLInputElement, PointerEvent> = (event) => {
    const currentDrag = dragState
    if (currentDrag === undefined || event.pointerId !== currentDrag.pointerId) {
      return
    }

    const horizontalDistance = event.clientX - currentDrag.startX
    if (!currentDrag.dragged && Math.abs(horizontalDistance) < DRAG_INTENT_DISTANCE) {
      return
    }

    currentDrag.dragged = true
    setDragging(true)
    suppressClick = true
    event.preventDefault()
    const {left, width} = event.currentTarget.getBoundingClientRect()
    const nextValue = getDraggedValue({
      clientX: event.clientX,
      left,
      range: props.getRange(),
      startValue: currentDrag.startValue,
      startX: currentDrag.startX,
      step: props.getStep(),
      width: width > 0 ? width : 1,
    })
    props.onValueChange(nextValue)
  }
  const finishPointer = (event: PointerEvent, shouldSuppressClick: boolean) => {
    const currentDrag = dragState
    if (currentDrag === undefined || event.pointerId !== currentDrag.pointerId) {
      return
    }

    suppressClick = shouldSuppressClick || currentDrag.dragged
    dragState = undefined
    setDragging(false)
    releasePointer(event.currentTarget as HTMLInputElement, event.pointerId)
  }
  const handlePointerUp: JSX.EventHandler<HTMLInputElement, PointerEvent> = (event) => {
    finishPointer(event, false)
  }
  const handlePointerCancel: JSX.EventHandler<HTMLInputElement, PointerEvent> = (event) => {
    finishPointer(event, true)
  }
  const handleLostPointerCapture: JSX.EventHandler<HTMLInputElement, PointerEvent> = (event) => {
    finishPointer(event, true)
  }
  const handleClick: JSX.EventHandler<HTMLInputElement, MouseEvent> = (event) => {
    if (!suppressClick) {
      return
    }

    event.preventDefault()
    suppressClick = false
  }

  onCleanup(() => {
    dragState = undefined
    setDragging(false)
  })

  return {
    dragging,
    handleClick,
    handleLostPointerCapture,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}
