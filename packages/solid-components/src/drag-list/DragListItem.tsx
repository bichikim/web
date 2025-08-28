import {Dynamic, DynamicProps} from 'solid-js/web'
import {ValidComponent, splitProps, useContext, createMemo} from 'solid-js'
import {DragListItemContext} from './DragListItemProvider'
import {DragListContext} from './DragListProvider'

export type DragListItemProps<T extends ValidComponent> = DynamicProps<T>

export const DragListItem = <T extends ValidComponent>(props: DragListItemProps<T>) => {
  const listContext = useContext(DragListContext)
  const itemContext = useContext(DragListItemContext)

  const isBeforeDrop = createMemo(() => {
    return listContext?.dragOverIndex() === itemContext?.index()
  })

  return (
    <Dynamic
      {...props}
      onDragStart={itemContext?.onDragStart}
      onDragOver={itemContext?.onDragOver}
      data-dragging={itemContext?.isDragging()}
    >
      {props.children}
    </Dynamic>
  )
}
