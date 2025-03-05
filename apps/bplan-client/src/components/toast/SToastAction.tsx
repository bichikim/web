import {MessageAction} from '@winter-love/solid-components'

export interface SToastActionProps extends MessageAction {
  onClose?: () => void
}

export const SToastAction = (props: SToastActionProps) => {
  const handleClick = () => {
    if (props.type !== 'click') {
      return
    }

    props.action()

    if (props.actionToClose) {
      props.onClose?.()
    }
  }

  return <button onClick={handleClick}>{props.label}</button>
}
