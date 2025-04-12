import {ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {useClose} from './context'

export type CloseBodyProps<T extends ValidComponent> = DynamicProps<T>

export const CloseBody = <T extends ValidComponent>(props: CloseBodyProps<T>) => {
  const [, {handleShow}] = useClose()

  const handleClose = (event: MouseEvent) => {
    props.onClick?.(event)
    handleShow(false)
  }

  return <Dynamic {...props} onClick={handleClose} />
}
