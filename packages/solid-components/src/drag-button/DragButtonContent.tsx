import {createMemo, useContext, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {DragButtonContext} from './context'
import {DRAG_BUTTON_VAR_DRAG_X} from './const'

export type DragButtonContentProps<T extends ValidComponent> = DynamicProps<T>

export const DragButtonContent = <T extends ValidComponent>(props: DragButtonContentProps<T>) => {
  const [dragContext] = useContext(DragButtonContext)

  const dragX = createMemo(() => dragContext().dragX)

  return (
    <Dynamic {...props} style={{[DRAG_BUTTON_VAR_DRAG_X]: `${dragX()}px`, 'touch-action': 'none'}}>
      {props.children}
    </Dynamic>
  )
}
