import {type Accessor, batch, createEffect, createSignal, on, onCleanup} from 'solid-js'
import type {PuppetDocument, PuppetPoint} from '../../player'
import {getEditorPoint, getEditorViewBox} from './viewport'
interface SkinPaintGestureOptions {
  readonly document: Accessor<PuppetDocument>
  readonly context: Accessor<string>
  readonly create: () => ((point: PuppetPoint) => void) | undefined
  readonly onStart?: () => void
  readonly onEnd?: () => void
}
export const useSkinPaintGesture = (options: SkinPaintGestureOptions) => {
  const [cursor, setCursor] = createSignal<PuppetPoint | null>(null)
  let paint: ((point: PuppetPoint) => void) | undefined
  let expected: PuppetDocument | undefined
  let capture: SVGSVGElement | undefined
  let pointer: number | undefined
  const stop = () => {
    const active = paint !== undefined
    paint = undefined
    expected = undefined
    const captured = pointer
    pointer = undefined
    if (captured !== undefined && capture?.hasPointerCapture?.(captured)) {
      capture.releasePointerCapture(captured)
    }
    capture = undefined
    window.removeEventListener('blur', stop)
    if (active) {
      options.onEnd?.()
    }
  }
  createEffect(
    on(options.context, () => {
      stop()
      setCursor(null)
    }),
  )
  createEffect(() => {
    const document = options.document()
    if (paint !== undefined && expected !== document) {
      stop()
    }
  })
  onCleanup(stop)
  const position = (event: PointerEvent) =>
    getEditorPoint({
      bounds: (event.currentTarget as SVGSVGElement).getBoundingClientRect(),
      clientPoint: {x: event.clientX, y: event.clientY},
      viewBox: getEditorViewBox(options.document()),
    })
  const apply = (point: PuppetPoint) =>
    batch(() => {
      setCursor(point)
      paint?.(point)
      expected = options.document()
    })
  return {
    cursor,
    start: (event: PointerEvent) => {
      if (event.button !== 0 || paint !== undefined) {
        return
      }
      const next = options.create()
      if (next === undefined) {
        return
      }
      event.preventDefault()
      paint = next
      expected = options.document()
      capture = event.currentTarget as SVGSVGElement
      pointer = event.pointerId
      capture.setPointerCapture?.(pointer)
      capture.focus()
      window.addEventListener('blur', stop)
      options.onStart?.()
      apply(position(event))
    },
    stop,
    end: (event: PointerEvent) => {
      if (pointer === event.pointerId) {
        stop()
      }
    },
    move: (event: PointerEvent) => {
      if (pointer !== undefined && pointer !== event.pointerId) {
        return
      }
      apply(position(event))
    },
    leave: () => {
      if (paint === undefined) {
        setCursor(null)
      }
    },
  }
}
