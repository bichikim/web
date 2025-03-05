import {Button, ButtonBodyProps} from '../button'
import {DragButtonContext} from './context'
import {createMemo, useContext} from 'solid-js'

export interface DragButtonBodyProps extends ButtonBodyProps {
  //
}

export const DragButtonBody = (props: DragButtonBodyProps) => {
  const [dragContext, {handleMouseDown, handleMouseMove, handleTouchMove}] =
    useContext(DragButtonContext)

  const dragX = createMemo(() => dragContext().dragX)

  return (
    <Button.Body
      {...props}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      style={{'--var-drag-x': `${dragX()}px`}}
    >
      {props.children}
    </Button.Body>
  )
}
