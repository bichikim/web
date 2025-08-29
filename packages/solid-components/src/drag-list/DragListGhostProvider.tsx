import {JSX, Show, createContext, Accessor, createMemo, children, createEffect} from 'solid-js'
import {Portal} from 'solid-js/web'
import {getDocument} from '@winter-love/utils'

export interface DragListGhostProviderProps {
  children: JSX.Element
  duration: number
  easing: string
  isDragging: boolean
  onHasJsxGhost: (value: boolean) => void
  position?: {x: number; y: number}
  relativePosition?: {x: number; y: number}
}

export interface DragListGhostContextProps {
  duration: Accessor<number>
  easing: Accessor<string>
  isDragging: Accessor<boolean>
  onHasJsxGhost: (value: boolean) => void
}

export const DragListGhostContext = createContext<DragListGhostContextProps>()

export const DragListGhostProvider = (props: DragListGhostProviderProps) => {
  const duration = createMemo(() => props.duration)
  const easing = createMemo(() => props.easing)
  const isDragging = createMemo(() => props.isDragging)

  return (
    <DragListGhostContext.Provider value={{duration, easing, isDragging, onHasJsxGhost: props.onHasJsxGhost}}>
      {props.children}
    </DragListGhostContext.Provider>
  )
}
