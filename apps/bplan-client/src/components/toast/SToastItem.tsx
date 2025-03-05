import {Message, useClose} from '@winter-love/solid-components'
import {createMemo} from 'solid-js'
import {Dynamic} from 'solid-js/web'

export interface SToastItemProps extends Message {
  //
}

export const SToastItem = (props: SToastItemProps) => {
  const [, {handleShow}] = useClose()

  const handleClick = () => {
    if (props.clickToClose) {
      handleShow(false)
    }
  }

  const rootTag = createMemo(() => {
    if (props.clickToClose) {
      return 'button'
    }

    return 'div'
  })

  return (
    <Dynamic
      component={rootTag()}
      onClick={handleClick}
      class="bg-opacity-90 bg-white rd-2 p-2 shadow-md backdrop-blur-sm"
    >
      {props.message}
    </Dynamic>
  )
}
