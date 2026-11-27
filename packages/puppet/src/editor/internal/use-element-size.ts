import {type Accessor, createSignal, createTrackedEffect} from 'solid-js'

export const useElementSize = (element: Accessor<HTMLElement | null>) => {
  const [size, setSize] = createSignal({height: 0, width: 0})
  createTrackedEffect(() => {
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

    return () => observer.disconnect()
  })
  return size
}
