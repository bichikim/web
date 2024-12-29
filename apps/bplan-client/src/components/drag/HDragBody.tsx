import {
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  onMount,
  splitProps,
  ValidComponent,
} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {DragContext} from './drag-context'

export interface HDragBodyProps extends JSX.HTMLAttributes<HTMLElement> {
  as?: ValidComponent
}

export const HDragBody = (props: HDragBodyProps) => {
  const [mounted, setMounted] = createSignal(false)
  const mergedProps = mergeProps({as: 'div'}, props)
  const [innerProps, restProps] = splitProps(mergedProps, ['as'])

  const [rootElement, setRootElement] = createSignal<null | HTMLElement>(null)

  onMount(() => {
    setMounted(true)
  })

  const parentPosition = createMemo(() => {
    const element = rootElement()
    const _mounted = mounted()
    if (!element || !_mounted) {
      return {x: 0, y: 0}
    }
    const rect = element.getBoundingClientRect()

    return {x: rect.left, y: rect.top}
  })

  return (
    <DragContext.Provider value={{parentPosition}}>
      <Dynamic ref={setRootElement} {...restProps} component={innerProps.as} />
    </DragContext.Provider>
  )
}
