import {Position} from '@winter-love/utils'
import {Dynamic} from 'solid-js/web'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
  mergeProps,
  splitProps,
  ValidComponent,
  onMount,
} from 'solid-js'

export interface DragBodyProps extends JSX.HTMLAttributes<HTMLElement> {
  as?: ValidComponent
}
import {DragContext} from './drag-context'

export const DragBody = (props: DragBodyProps) => {
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
