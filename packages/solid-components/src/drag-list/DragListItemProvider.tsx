import {DragListContext} from './DragListProvider'
import {
  ParentProps,
  useContext,
  createContext,
  ValidComponent,
  splitProps,
  createMemo,
  Accessor,
  createSignal,
  onCleanup,
} from 'solid-js'
import {getDocument} from '@winter-love/utils'

export interface DragListItemInnerProps {
  //
  index: number
  value: any
}

export type DragListItemProviderProps = ParentProps & DragListItemInnerProps

export interface DragListItemContextProps {
  index: Accessor<number>
  onDrag: (event: MouseEvent) => void
  onDragEnd: (event: MouseEvent, itemElement: HTMLElement) => void
  onDragOver: (event: MouseEvent) => void
  onDragStart: (event: MouseEvent) => void
  //
  value: Accessor<any>
}

export const DragListItemContext = createContext<DragListItemContextProps>()

export const DragListItemProvider = <T extends ValidComponent>(props: DragListItemProviderProps) => {
  const context = useContext(DragListContext)

  const handleDragStart = (event: MouseEvent) => {
    context?.onDragStart(props.index)
  }

  const handleDrag = (event: MouseEvent) => {
    // skip
  }

  const handleDragEnd = (event: MouseEvent, itemElement: HTMLElement) => {
    context?.onDragEnd()
  }

  const handleDragOver = (event: MouseEvent) => {
    context?.onDragOver(props.index)
  }

  const index = createMemo(() => {
    return props.index
  })

  const value = createMemo(() => {
    return props.value
  })

  return (
    <DragListItemContext.Provider
      value={{
        index,
        onDrag: handleDrag,
        onDragEnd: handleDragEnd,
        onDragOver: handleDragOver,
        onDragStart: handleDragStart,
        value,
      }}
    >
      {props.children}
    </DragListItemContext.Provider>
  )
}
