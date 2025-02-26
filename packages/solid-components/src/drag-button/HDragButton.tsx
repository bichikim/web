import {splitProps} from 'solid-js'
import {HDragButtonRoot, HDragButtonRootProps} from './HDragButtonRoot'
import {HDragButtonBody, HDragButtonBodyProps} from './HDragButtonBody'

export interface HDragButtonProps extends HDragButtonBodyProps, HDragButtonRootProps {
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
    <HDragButtonRoot {...rootProps}>
      <HDragButtonBody {...bodyProps}>{props.children}</HDragButtonBody>
    </HDragButtonRoot>
  )
}
