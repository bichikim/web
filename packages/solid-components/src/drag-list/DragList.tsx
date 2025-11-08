import {DragListProvider, DragListProviderProps} from './DragListProvider'
import {DragLoop} from './DragLoop'
import {type JSX, ValidComponent, splitProps} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'

export type DragListProps<T extends ValidComponent, A extends readonly any[]> = DragListProviderProps<A> &
  DynamicProps<T>

export const DragList = <T extends ValidComponent, A extends readonly any[]>(props: DragListProps<T, A>) => {
  const [innerProps, restProps] = splitProps(props, ['list', 'idDetector', 'onChangeList'])

  return (
    <DragListProvider {...innerProps}>
      <Dynamic {...(restProps as any)}>
        <DragLoop>{props.children}</DragLoop>
      </Dynamic>
    </DragListProvider>
  )
}
