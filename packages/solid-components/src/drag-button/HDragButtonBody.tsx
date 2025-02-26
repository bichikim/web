import {Button, HButtonBodyProps} from '../button'
import {DragButtonContext} from './context'
import {createMemo, useContext} from 'solid-js'

export interface HDragButtonBodyProps extends HButtonBodyProps {
  //
}

export const HDragButtonBody = (props: HDragButtonBodyProps) => {
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
