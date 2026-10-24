import {splitProps} from 'solid-js'
import {DragButtonProvider, DragButtonProviderProps} from './DragButtonProvider'
import {DragButtonBody, DragButtonBodyProps} from './DragButtonBody'

export type HDragButtonProps = DragButtonProviderProps & Omit<DragButtonBodyProps, 'onClick'>

export const HDragButton = (props: HDragButtonProps) => {
  const [rootProps, bodyProps] = splitProps(props, [
    'allowBottom',
    'allowTop',
    'autoLoading',
    'as',
    'clickAllowMoveSize',
    'disabled',
    'doubleClickGap',
    'dragExecuteSize',
    'dragEndSize',
    'href',
    'loading',
    'onClick',
    'onDoubleClick',
    'onLeftExecute',
    'onRightExecute',
    'onTouchStart',
    'onTouchEnd',
    'preventLeft',
    'preventLoadingDisabled',
    'preventRight',
    'type',
  ])

  return (
    <DragButtonProvider {...rootProps}>
      <DragButtonBody {...(bodyProps as DragButtonBodyProps)}>{props.children}</DragButtonBody>
    </DragButtonProvider>
  )
}
