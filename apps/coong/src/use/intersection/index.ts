import {Accessor, createEffect, createSignal, onCleanup} from 'solid-js'

export const useIntersection = (target: Accessor<HTMLElement | undefined>, options: IntersectionObserverInit) => {
  const [isIntersecting, setIsIntersecting] = createSignal(false)

  createEffect(() => {
    const _target = target()

    if (!_target) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
        } else {
          setIsIntersecting(false)
        }
      }
    }, options)

    observer.observe(_target)

    onCleanup(() => {
      observer.disconnect()
    })
  })

  return isIntersecting
}
