import {JSX, Show, createContext, Accessor, createMemo, children, createEffect, useContext} from 'solid-js'
import {Portal} from 'solid-js/web'
import {getDocument} from '@winter-love/utils'
import {DragListItemContext} from './DragListItemProvider'

export interface DragListGhostProviderProps {
  children: JSX.Element
  duration: number
  easing: string
  isDragging: boolean
  position?: {x: number; y: number}
  relativePosition?: {x: number; y: number}
}

export interface DragListGhostContextProps {
  duration: Accessor<number>
  easing: Accessor<string>
  isDragging: Accessor<boolean>
}

export const DragListGhostContext = createContext<DragListGhostContextProps>()

export const DragListGhostProvider = (props: DragListGhostProviderProps) => {
  const context = useContext(DragListItemContext)
  const duration = createMemo(() => props.duration)
  const easing = createMemo(() => props.easing)
  const isDragging = createMemo(() => props.isDragging)

  return (
    <DragListGhostContext.Provider value={{duration, easing, isDragging}}>
      <Show when={isDragging()}>
        <Portal mount={getDocument()?.body}>{props.children}</Portal>
      </Show>
    </DragListGhostContext.Provider>
  )
}
