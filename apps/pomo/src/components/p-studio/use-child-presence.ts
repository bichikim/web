import {type Accessor, createEffect, createSignal, onCleanup, onMount} from 'solid-js'

/** Reports whether the mounted element currently contains rendered element children. */
export const useChildPresence = (element: Accessor<HTMLElement | undefined>) => {
  const [hasChildren, setHasChildren] = createSignal(false)

  onMount(() => {
    createEffect(() => {
      const currentElement = element()

      if (currentElement === undefined) {
        setHasChildren(false)
        return
      }

      const updatePresence = () => setHasChildren(currentElement.childElementCount > 0)
      const observer = new MutationObserver(updatePresence)

      updatePresence()
      observer.observe(currentElement, {childList: true})
      onCleanup(() => observer.disconnect())
    })
  })

  return hasChildren
}
