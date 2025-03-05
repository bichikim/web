import {useClose} from 'src/close'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {ValidComponent} from 'solid-js'

export type DialogOverlayProps<T extends ValidComponent> = DynamicProps<T>

export const DialogOverlay = <T extends ValidComponent>(props: DialogOverlayProps<T>) => {
  const [, {handleShow}] = useClose()

  const handleClose = (event: MouseEvent) => {
    props.onClick?.(event)
    handleShow(false)
  }

  return (
    <Dynamic {...props} onClick={handleClose}>
      {props.children}
    </Dynamic>
  )
}
