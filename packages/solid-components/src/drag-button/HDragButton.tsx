import {splitProps} from 'solid-js'
import {DragButtonProvider, DragButtonProviderProps} from './DragButtonProvider'
import {DragButtonBody, DragButtonBodyProps} from './DragButtonBody'

export interface HDragButtonProps extends DragButtonBodyProps, DragButtonProviderProps {
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
    'onTouchStart',
    'onTouchEnd',
  ])

  return (
    <DragButtonProvider {...rootProps}>
      <DragButtonBody {...bodyProps}>{props.children}</DragButtonBody>
    </DragButtonProvider>
  )
}
