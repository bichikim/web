import {DragListGhostContext} from './DragListGhostProvider'
import {useContext, ValidComponent, Show, onMount, onCleanup} from 'solid-js'
import {Dynamic, DynamicProps, Portal} from 'solid-js/web'
import {getDocument} from '@winter-love/utils'

export type DragListGhostProps<T extends ValidComponent> = DynamicProps<T>

export const DragListGhost = <T extends ValidComponent>(props: DragListGhostProps<T>) => {
  const context = useContext(DragListGhostContext)

  return (
    <Dynamic
      {...props}
      data-is-drag={context?.isDragging()}
      style={{
        '--solid-drag-list-ghost': context?.easing(),
        '--solid-drag-list-ghost-duration': context?.duration(),
      }}
    >
      {props.children}
    </Dynamic>
  )
}
