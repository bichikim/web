import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {createEffect, createSignal, onCleanup, untrack} from 'solid-js'

/**
 * Calls onEntry for each active observer entry, in delivery order, before updating visibility.
 * Entries remaining after observer cleanup are ignored.
 */
export const useIntersection = (
  target: MaybeAccessor<HTMLElement | null>,
  options: MaybeAccessor<IntersectionObserverInit>,
  onEntry?: (entry: IntersectionObserverEntry) => void,
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
      for (const entry of entries) {
        if (!observing) {
          return
        }
        untrack(() => onEntry?.(entry))
        if (!observing) {
          return
        }
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
