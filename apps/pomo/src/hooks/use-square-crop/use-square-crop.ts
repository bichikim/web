import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'

import {getSquareCropFrame} from './get-square-crop-frame'
import {getSquareCropKeyboardDelta} from './get-square-crop-keyboard-delta'
import {getSquareCropPosition} from './get-square-crop-position'
import {resizeSquareCrop} from './resize-square-crop'
import type {
  SquareCropDimensions,
  SquareCropFrame,
  SquareCropHandle,
  SquareCropPoint,
  SquareCropResizeHandle,
  SquareCropSelection,
  SquareCropZoomLimits,
} from './types'

export interface UseSquareCropProps {
  readonly image: Accessor<SquareCropDimensions | null>
  readonly viewport: Accessor<SquareCropDimensions>
  readonly zoomLimits: Accessor<SquareCropZoomLimits>
  readonly keyboardStep?: number
}

export interface SquareCropPointer {
  readonly pointerId: number
  readonly point: SquareCropPoint
}

export interface SquareCropGesture extends SquareCropPointer {
  readonly handle: SquareCropHandle
}

export interface SquareCropController {
  readonly frame: Accessor<SquareCropFrame | null>
  readonly selection: Accessor<SquareCropSelection | null>
  readonly position: Accessor<SquareCropPoint>
  readonly zoom: Accessor<number>
  readonly reset: () => void
  readonly changeZoom: (zoom: number) => void
  readonly moveTo: (position: SquareCropPoint) => void
  readonly beginGesture: (gesture: SquareCropGesture) => boolean
  readonly moveGesture: (pointer: SquareCropPointer) => void
  readonly endGesture: (pointerId?: number) => void
  readonly moveWithKeyboard: (key: string) => boolean
  readonly resizeWithKeyboard: (handle: SquareCropResizeHandle, key: string) => boolean
}

interface CropConfiguration {
  readonly image: SquareCropDimensions | null
  readonly viewport: SquareCropDimensions
  readonly zoomLimits: SquareCropZoomLimits
}

interface ActiveGesture extends SquareCropGesture {
  readonly configuration: CropConfiguration
  readonly frame: SquareCropFrame
}

const DEFAULT_KEYBOARD_STEP = 5

const hasFinitePoint = (point: SquareCropPoint): boolean =>
  Number.isFinite(point.x) && Number.isFinite(point.y)

const clampValue = (value: number, minimum: number, maximum: number, fallback: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isNaN(value) ? fallback : value))

const boundPosition = (position: SquareCropPoint): SquareCropPoint => ({
  x: clampValue(position.x, -1, 1, 0),
  y: clampValue(position.y, -1, 1, 0),
})

const normalizeZoomLimits = (limits: SquareCropZoomLimits): SquareCropZoomLimits => {
  const {minimum: lower, maximum: upper} = limits
  const minimum = Number.isFinite(lower) ? Math.max(1, lower) : 1
  const maximum = Number.isFinite(upper) ? Math.max(minimum, upper) : minimum
  return {maximum, minimum}
}

const getMovedPosition = (frame: SquareCropFrame, delta: SquareCropPoint): SquareCropPoint =>
  getSquareCropPosition(frame, {
    size: frame.cropSize,
    x: frame.cropX + delta.x,
    y: frame.cropY + delta.y,
  })

const getResizePointer = (
  frame: SquareCropFrame,
  handle: SquareCropResizeHandle,
): SquareCropPoint => ({
  x: handle.includes('west')
    ? frame.cropX
    : handle.includes('east')
      ? frame.cropX + frame.cropSize
      : frame.cropX + frame.cropSize / 2,
  y: handle.includes('north')
    ? frame.cropY
    : handle.includes('south')
      ? frame.cropY + frame.cropSize
      : frame.cropY + frame.cropSize / 2,
})

const readCropConfiguration = (props: UseSquareCropProps): CropConfiguration => {
  const image = props.image()
  const viewport = props.viewport()
  const zoomLimits = props.zoomLimits()
  return {
    image: image === null ? null : {height: image.height, width: image.width},
    viewport: {height: viewport.height, width: viewport.width},
    zoomLimits: normalizeZoomLimits(zoomLimits),
  }
}

/**
 * Coordinates use viewport units; position uses [-1, 1] and zoom stays at least 1.
 * Configuration changes cancel gestures while retaining the bounded selection.
 * Reset centers the selection at minimum zoom. Image resources stay caller-owned.
 */
export const useSquareCrop = (props: UseSquareCropProps): SquareCropController => {
  const configuration = createMemo(() => readCropConfiguration(props))
  const [requestedZoom, setZoom] = createSignal(1)
  const [position, setPosition] = createSignal<SquareCropPoint>({x: 0, y: 0})
  const [gesture, setGesture] = createSignal<ActiveGesture | null>(null)
  const zoom = createMemo(() => {
    const limits = configuration().zoomLimits
    return clampValue(requestedZoom(), limits.minimum, limits.maximum, limits.minimum)
  })
  const frame = createMemo(() => {
    const current = configuration()
    return current.image === null
      ? null
      : getSquareCropFrame({
          image: current.image,
          position: position(),
          viewport: current.viewport,
          zoom: zoom(),
        })
  })
  const selection = createMemo(() => {
    const current = frame()
    return current === null ? null : {size: current.cropSize, x: current.cropX, y: current.cropY}
  })

  createEffect(() => {
    const current = configuration()
    untrack(() => {
      setZoom(zoom())
      setGesture((active) => (active?.configuration === current ? active : null))
    })
  })
  onCleanup(() => setGesture(null))

  const endGesture = (pointerId?: number): void => {
    const current = gesture()
    if (pointerId === undefined || current?.pointerId === pointerId) {
      setGesture(null)
    }
  }

  const changeZoom = (value: number): void => {
    const limits = configuration().zoomLimits
    endGesture()
    setZoom(clampValue(value, limits.minimum, limits.maximum, limits.minimum))
  }

  const moveTo = (value: SquareCropPoint): void => {
    endGesture()
    setPosition(boundPosition(value))
  }

  const reset = (): void => {
    const limits = configuration().zoomLimits
    batch(() => {
      endGesture()
      setPosition({x: 0, y: 0})
      setZoom(limits.minimum)
    })
  }

  const applySelection = (current: SquareCropFrame, next: SquareCropSelection): void => {
    batch(() => {
      setPosition(getSquareCropPosition(current, next))
      setZoom(current.maximumCropSize / next.size)
    })
  }

  const beginGesture = (pointer: SquareCropGesture): boolean => {
    const current = frame()
    const currentConfig = configuration()
    if (
      current === null ||
      gesture()?.configuration === currentConfig ||
      !hasFinitePoint(pointer.point)
    ) {
      return false
    }
    setGesture({...pointer, configuration: currentConfig, frame: current})
    return true
  }

  const moveGesture = (pointer: SquareCropPointer): void => {
    const start = gesture()
    if (start === null || start.pointerId !== pointer.pointerId || !hasFinitePoint(pointer.point)) {
      return
    }
    if (start.configuration !== configuration()) {
      endGesture()
      return
    }
    const delta = {x: pointer.point.x - start.point.x, y: pointer.point.y - start.point.y}
    if (start.handle === 'move') {
      setPosition(getMovedPosition(start.frame, delta))
      return
    }
    applySelection(
      start.frame,
      resizeSquareCrop({
        frame: start.frame,
        handle: start.handle,
        pointer: pointer.point,
        zoomLimits: start.configuration.zoomLimits,
      }),
    )
  }

  const moveWithKeyboard = (key: string): boolean => {
    const current = frame()
    const delta = getSquareCropKeyboardDelta(key, props.keyboardStep ?? DEFAULT_KEYBOARD_STEP)
    if (current === null || delta === null) {
      return false
    }
    moveTo(getMovedPosition(current, delta))
    return true
  }

  const resizeWithKeyboard = (handle: SquareCropResizeHandle, key: string): boolean => {
    const current = frame()
    const delta = getSquareCropKeyboardDelta(
      key,
      props.keyboardStep ?? DEFAULT_KEYBOARD_STEP,
      handle,
    )
    if (current === null || delta === null) {
      return false
    }
    const pointer = getResizePointer(current, handle)
    endGesture()
    applySelection(
      current,
      resizeSquareCrop({
        frame: current,
        handle,
        pointer: {x: pointer.x + delta.x, y: pointer.y + delta.y},
        zoomLimits: configuration().zoomLimits,
      }),
    )
    return true
  }

  return {
    beginGesture,
    changeZoom,
    endGesture,
    frame,
    moveGesture,
    moveTo,
    moveWithKeyboard,
    position,
    reset,
    resizeWithKeyboard,
    selection,
    zoom,
  }
}
