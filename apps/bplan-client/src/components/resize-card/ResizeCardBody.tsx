import {Dynamic, DynamicProps} from 'solid-js/web'
import {ResizeCardContext} from './ResizeCardProvider'
import {createSignal, onMount, useContext, ValidComponent} from 'solid-js'

export type ResizeCardBodyProps<T extends ValidComponent> = DynamicProps<T>

export const ResizeCardBody = <T extends ValidComponent>(
  props: ResizeCardBodyProps<T>,
) => {
  const [element, setElement] = createSignal<HTMLElement | undefined>()

  const {initSize} = useContext(ResizeCardContext)

  onMount(() => {
    const _element = element()

    if (_element) {
      initSize(_element)
    }
  })

  return <Dynamic {...props} ref={setElement} />
}
