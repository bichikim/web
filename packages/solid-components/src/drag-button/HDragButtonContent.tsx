import {createMemo, useContext, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {DragButtonContext} from './context'

export type HDragButtonContentProps<T extends ValidComponent> = DynamicProps<T>

export const HDragButtonContent = <T extends ValidComponent>(
  props: HDragButtonContentProps<T>,
) => {
  const [dragContext] = useContext(DragButtonContext)

  const dragX = createMemo(() => dragContext().dragX)

  return (
    <Dynamic {...props} style={{'--var-drag-x': `${dragX()}px`, 'touch-action': 'none'}}>
      {props.children}
    </Dynamic>
  )
}
