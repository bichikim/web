import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {createEffect, createSignal, onCleanup} from 'solid-js'

export const useIntersection = (
  target: MaybeAccessor<HTMLElement | null>,
  options: MaybeAccessor<IntersectionObserverInit>,
) => {
  const targetAccessor = resolveAccessor(target)
  const optionsAccessor = resolveAccessor(options)
  const [isIntersecting, setIsIntersecting] = createSignal(false)

  createEffect(() => {
    const options = optionsAccessor()
    const element = targetAccessor()
    setIsIntersecting(false)

    if (!element) {
      return
    }

    let observing = true
    const observer = new IntersectionObserver((entries) => {
      if (!observing) {
        return
      }

      for (const entry of entries) {
        setIsIntersecting(entry.isIntersecting)
      }
    }, options)

    observer.observe(element)

    onCleanup(() => {
      observing = false
      observer.disconnect()
    })
  })

  return isIntersecting
}
