import {ParentProps} from 'solid-js'
import {Dynamic, Portal} from 'solid-js/web'
import {AnyElementOrComponent} from 'src/types'

export interface DialogProps extends ParentProps {
  as?: AnyElementOrComponent
  /**
   * any value can be boolean
   */
  when?: any
}

export const Dialog = (props: ParentProps) => {
  return <Dynamic component="div">{props.children}</Dynamic>
}
