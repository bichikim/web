import {useClose} from 'src/close'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {ValidComponent} from 'solid-js'

export type HDialogOverlayProps<T extends ValidComponent> = DynamicProps<T>

export const HDialogOverlay = <T extends ValidComponent>(
  props: HDialogOverlayProps<T>,
) => {
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
