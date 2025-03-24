import {createMemo, useContext} from 'solid-js'
import {Button, ButtonBodyProps} from '../button'
import {DragButtonContext} from './context'

export interface DragButtonBodyProps extends ButtonBodyProps {
  //
}

export const DragButtonBody = (props: DragButtonBodyProps) => {
  const [dragContext, {handleMouseDown}] = useContext(DragButtonContext)

  const style = createMemo(() => {
    const {dragX} = dragContext()

    if (dragX) {
      return {
        '--var-drag-x': `${dragX}px`,
      }
    }
  })

  return (
    <Button.Body {...props} onMouseDown={handleMouseDown} style={style()}>
      {props.children}
    </Button.Body>
  )
}
