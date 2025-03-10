import {Button, ButtonBodyProps} from '../button'
import {DragButtonContext} from './context'
import {createMemo, useContext} from 'solid-js'

export interface DragButtonBodyProps extends ButtonBodyProps {
  //
}

export const DragButtonBody = (props: DragButtonBodyProps) => {
  const [dragContext, {handleMouseDown, handleMouseMove, handleTouchMove}] =
    useContext(DragButtonContext)

  const style = createMemo(() => {
    const {dragX} = dragContext()

    if (dragX) {
      return {
        '--var-drag-x': `${dragX}px`,
      }
    }
  })

  return (
    <Button.Body
      {...props}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      style={style()}
    >
      {props.children}
    </Button.Body>
  )
}
