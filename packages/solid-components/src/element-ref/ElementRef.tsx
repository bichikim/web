import {onCleanup, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'

export type ElementRefProps<T extends ValidComponent> = DynamicProps<T>

/**
 * A component that solves the problem of ref being stored in ref even after the element is removed in solid-js
 */
export const ElementRef = <T extends ValidComponent>(props: DynamicProps<T>) => {
  onCleanup(() => {
    props.ref(null)
  })

  return <Dynamic {...props} />
}
