import {type Accessor, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import type {ChangeRow} from './types'
import type {TextMatch} from './find-text'
import {createChangeWindow} from './create-change-window'

interface UseChangeViewportProps {
  readonly rows: Accessor<readonly ChangeRow[]>
  readonly element: Accessor<HTMLDivElement | null>
  readonly match: Accessor<TextMatch | undefined>
  readonly request: Accessor<number>
}
const VIRTUAL_THRESHOLD = 500
const INITIAL_HEIGHT = 400

export const useChangeViewport = (props: UseChangeViewportProps) => {
  const [width, setWidth] = createSignal(0)
  const [offset, setOffset] = createSignal(0)
  const [height, setHeight] = createSignal(INITIAL_HEIGHT)
  const source = createMemo(() =>
    props
      .rows()
      .map((row) => row.text)
      .join('\n'),
  )
  const virtual = createMemo(() => props.rows().length > VIRTUAL_THRESHOLD)
  const offsets = createMemo(() => Array.from(source().matchAll(/^/gmu), (match) => match.index))
  const current = createMemo(() => {
    const match = props.match()
    return match === undefined || props.request() === 0
      ? -1
      : Math.max(
          0,
          offsets().findLastIndex((position) => position <= match.start),
        )
  })
  const viewport = createMemo(() =>
    createChangeWindow({
      count: props.rows().length,
      height: height(),
      offset: offset(),
    }),
  )
  createEffect(
    on(source, () => {
      setWidth(0)
      setOffset(0)
      const container = props.element()
      if (container !== null) {
        container.scrollTop = 0
      }
    }),
  )
  createEffect(
    on(props.element, (container) => {
      if (container !== null) {
        setHeight(container.clientHeight || INITIAL_HEIGHT)
        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(() =>
            setHeight(container.clientHeight || INITIAL_HEIGHT),
          )
          observer.observe(container)
          onCleanup(() => observer.disconnect())
        }
      }
    }),
  )
  const scroll = (event: Event & {currentTarget: HTMLDivElement}): void => {
    if (virtual()) {
      setWidth(Math.max(width(), event.currentTarget.scrollWidth))
      setOffset(event.currentTarget.scrollTop)
    }
  }
  return {
    bottom: () => (virtual() ? viewport().bottom : 0),
    gap: (index: number) => (virtual() && index === viewport().start ? viewport().top : 0),
    indices: createMemo(() =>
      virtual()
        ? Array.from(
            {length: viewport().end - viewport().start},
            (_, index) => viewport().start + index,
          )
        : props.rows().map((_, index) => index),
    ),
    locate: (): void => {
      const container = props.element()
      if (virtual() && current() >= 0 && container !== null) {
        container.scrollTop = viewport().locate(current())
        setOffset(container.scrollTop)
      }
    },
    scroll,
    source,
    width,
  }
}
