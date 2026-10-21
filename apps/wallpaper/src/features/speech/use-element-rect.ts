import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import type {SpeechRect} from './types'

interface UseElementRectProps {
  readonly element: Accessor<HTMLElement | null>
  readonly layout?: Accessor<unknown>
  readonly moving?: Accessor<boolean>
}
/** Observes the viewport bounds of an element as its size or layout changes. */
export const useElementRect = (props: UseElementRectProps): Accessor<SpeechRect | null> => {
  const [rect, setRect] = createSignal<SpeechRect | null>(null)
  const measure = () => {
    const bounds = props.element()?.getBoundingClientRect()
    setRect(
      bounds === undefined
        ? null
        : {height: bounds.height, width: bounds.width, x: bounds.left, y: bounds.top},
    )
  }
  createEffect(() => {
    props.layout?.()
    measure()
  })
  createEffect(() => {
    const current = props.element()
    const moving = props.moving?.() ?? false
    if (current === null) {
      setRect(null)
      return
    }
    let frame: number | undefined
    const schedule = () => {
      if (frame === undefined) {
        frame = requestAnimationFrame(() => {
          frame = undefined
          measure()
          if (moving) {
            schedule()
          }
        })
      }
    }
    const observer =
      typeof globalThis.ResizeObserver === 'undefined'
        ? null
        : new globalThis.ResizeObserver(schedule)
    observer?.observe(current)
    if (moving) {
      schedule()
    }
    onCleanup(() => {
      observer?.disconnect()
      if (frame !== undefined) {
        cancelAnimationFrame(frame)
      }
    })
  })
  return rect
}
