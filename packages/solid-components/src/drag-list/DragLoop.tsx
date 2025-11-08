import {DragListProvider, DragListProviderProps} from './DragListProvider'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {For, ValidComponent, Accessor, type JSX, useContext} from 'solid-js'
import {DragListContext} from './DragListProvider'
import {DragListItemProvider} from './DragListItemProvider'

export type DragLoopProps<T extends readonly any[]> = {
  children: JSX.Element
}

export const DragLoop = (props: DragLoopProps<any[]>) => {
  const context = useContext(DragListContext)

  return (
    <For each={context?.list?.()}>
      {(item, index) => (
        <DragListItemProvider index={index()} value={item}>
          {props.children}
        </DragListItemProvider>
      )}
    </For>
  )
}
