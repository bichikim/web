import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {ImageCamera} from './view-state/types'

interface ImagePoint {
  readonly x: number
  readonly y: number
}
interface ImageSize {
  readonly height: number
  readonly width: number
}
interface UseImageViewProps {
  natural: Accessor<ImageSize>
  viewport: Accessor<ImageSize>
}
interface DragGesture {
  readonly mode: 'drag'
  readonly origin: ImagePoint
  readonly position: ImagePoint
}
interface PinchGesture {
  readonly mode: 'pinch'
  readonly anchor: ImagePoint
  readonly distance: number
  readonly scale: number
}
type ImageGesture = DragGesture | PinchGesture
const MIN_PERCENT = 1
const MAX_PERCENT = 1600
const PERCENT = 100
const TENTHS = 10
const position = (value: number, available: number, size: number): number =>
  size <= available ? (available - size) / 2 : Math.min(0, Math.max(available - size, value))
const center = (first: ImagePoint, second: ImagePoint): ImagePoint => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
})
const distance = (first: ImagePoint, second: ImagePoint): number =>
  Math.hypot(first.x - second.x, first.y - second.y)

export const useImageView = (props: UseImageViewProps) => {
  const [camera, setCamera] = createSignal<ImageCamera>({mode: 'fit'})
  const [gesture, setGesture] = createSignal<ImageGesture | null>(null)
  const pointers = new Map<number, ImagePoint>()
  const loaded = createMemo(() => props.natural().width > 0 && props.natural().height > 0)
  const view = createMemo(() => {
    const natural = props.natural()
    const viewport = props.viewport()
    const current = camera()
    const fitting =
      loaded() && viewport.width > 0 && viewport.height > 0
        ? Math.min(1, viewport.width / natural.width, viewport.height / natural.height)
        : 1
    const scale = current.mode === 'fit' ? fitting : current.scale
    const width = natural.width * scale
    const height = natural.height * scale
    return {
      height,
      scale,
      width,
      x: position(current.mode === 'fit' ? 0 : current.x, viewport.width, width),
      y: position(current.mode === 'fit' ? 0 : current.y, viewport.height, height),
    }
  })
  const pannable = createMemo(
    () => view().width > props.viewport().width || view().height > props.viewport().height,
  )
  const percent = createMemo(() => Math.round(view().scale * PERCENT * TENTHS) / TENTHS)
  const zoom = (value: number, point?: ImagePoint): void => {
    if (!Number.isFinite(value)) {
      return
    }
    const current = view()
    const viewport = props.viewport()
    const anchor = point ?? {x: viewport.width / 2, y: viewport.height / 2}
    const scale = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value)) / PERCENT
    setCamera({
      mode: 'zoom',
      scale,
      x: anchor.x - ((anchor.x - current.x) * scale) / current.scale,
      y: anchor.y - ((anchor.y - current.y) * scale) / current.scale,
    })
  }
  const fit = (): void => {
    pointers.clear()
    setGesture(null)
    setCamera({mode: 'fit'})
  }
  const pan = (delta: ImagePoint): boolean => {
    if (!pannable()) {
      return false
    }
    const current = view()
    setCamera({mode: 'zoom', scale: current.scale, x: current.x + delta.x, y: current.y + delta.y})
    return true
  }
  const capture = (): void => {
    const points = Array.from(pointers.values())
    const current = view()
    if (points.length === 2) {
      const midpoint = center(points[0], points[1])
      setGesture({
        anchor: {
          x: (midpoint.x - current.x) / current.scale,
          y: (midpoint.y - current.y) / current.scale,
        },
        distance: Math.max(1, distance(points[0], points[1])),
        mode: 'pinch',
        scale: current.scale,
      })
    } else {
      setGesture(points.length === 1 ? {mode: 'drag', origin: points[0], position: current} : null)
    }
  }
  const begin = (pointer: number, point: ImagePoint): boolean => {
    if (pointers.size >= 2) {
      return false
    }
    pointers.set(pointer, point)
    capture()
    return true
  }
  const move = (pointer: number, point: ImagePoint): void => {
    if (!pointers.has(pointer)) {
      return
    }
    pointers.set(pointer, point)
    const current = gesture()
    if (current === null) {
      return
    }
    if (current.mode === 'pinch') {
      const points = Array.from(pointers.values())
      const midpoint = center(points[0], points[1])
      const scale = Math.min(
        MAX_PERCENT / PERCENT,
        Math.max(
          MIN_PERCENT / PERCENT,
          (current.scale * distance(points[0], points[1])) / current.distance,
        ),
      )
      setCamera({
        mode: 'zoom',
        scale,
        x: midpoint.x - current.anchor.x * scale,
        y: midpoint.y - current.anchor.y * scale,
      })
    } else if (pannable()) {
      setCamera({
        mode: 'zoom',
        scale: view().scale,
        x: current.position.x + point.x - current.origin.x,
        y: current.position.y + point.y - current.origin.y,
      })
    }
  }
  const end = (pointer: number): void => {
    if (pointers.delete(pointer)) {
      capture()
    }
  }
  return {
    begin,
    camera,
    dragging: () => gesture() !== null && (pannable() || gesture()?.mode === 'pinch'),
    end,
    fit,
    fitting: () => camera().mode === 'fit',
    loaded,
    maximum: MAX_PERCENT,
    minimum: MIN_PERCENT,
    move,
    pan,
    pannable,
    percent,
    restore: (value: ImageCamera) => {
      pointers.clear()
      setGesture(null)
      setCamera(value)
    },
    view,
    zoom,
  }
}
