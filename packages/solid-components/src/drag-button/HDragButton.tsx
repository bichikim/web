import {splitProps} from 'solid-js'
import {DragButtonRoot, DragButtonRootProps} from './DragButtonRoot'
import {DragButtonBody, DragButtonBodyProps} from './DragButtonBody'

export interface HDragButtonProps extends DragButtonBodyProps, DragButtonRootProps {
  //
}

export const HDragButton = (props: HDragButtonProps) => {
  const [rootProps, bodyProps] = splitProps(props, [
    'dragExecuteSize',
    'dragEndSize',
    'onClick',
    'onDoubleClick',
    'onLeftExecute',
    'onRightExecute',
  ])

  return (
    <DragButtonRoot {...rootProps}>
      <DragButtonBody {...bodyProps}>{props.children}</DragButtonBody>
    </DragButtonRoot>
  )
}
