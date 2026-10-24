import {DragListContext, DragListProvider, DragListProviderProps} from './DragListProvider'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {Accessor, For, type JSX, useContext, ValidComponent} from 'solid-js'
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
