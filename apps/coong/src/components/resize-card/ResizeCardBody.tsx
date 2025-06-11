import {Dynamic, DynamicProps} from 'solid-js/web'
import {ResizeCardContext} from './ResizeCardProvider'
import {createEffect, createMemo, createSignal, onCleanup, onMount, useContext, ValidComponent} from 'solid-js'

export type ResizeCardBodyProps<T extends ValidComponent> = DynamicProps<T>

export const ResizeCardBody = <T extends ValidComponent>(props: ResizeCardBodyProps<T>) => {
  const [element, setElement] = createSignal<HTMLElement | undefined>()

  const {size, setElement: setElementContext} = useContext(ResizeCardContext)

  createEffect(() => {
    const _element = element()

    if (_element) {
      setElementContext(_element)
    }

    onCleanup(() => {
      setElementContext(undefined)
    })
  })

  const style = createMemo(() => {
    const _size = size()

    if (!_size) {
      return {}
    }

    return {
      height: _size.height ? `${_size.height}px` : undefined,
      width: _size.width ? `${_size.width}px` : undefined,
    }
  })

  return <Dynamic {...props} ref={setElement} style={style()} />
}
