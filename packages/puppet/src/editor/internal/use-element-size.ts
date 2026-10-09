import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'

export const useElementSize = (element: Accessor<HTMLElement | null>) => {
  const [size, setSize] = createSignal({height: 0, width: 0})
  createEffect(() => {
    const current = element()
    if (current === null) {
      return
    }
    const measure = () => setSize({height: current.clientHeight, width: current.clientWidth})
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(measure)
    observer.observe(current)
    onCleanup(() => observer.disconnect())
  })
  return size
}
