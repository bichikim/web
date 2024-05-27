import {onCleanup, onMount, Setter} from 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      ref: (v: any) => any
    }
  }
}

export const ref = (element: Element, value: () => Setter<null | Element>) => {
  const set = value()
  onCleanup(() => {
    set(null)
  })
  onMount(() => {
    set(element)
  })
}
