import {ParentProps, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'

export interface WScrollProps extends ParentProps {
  [key: string]: any
  /**
   * class recommended relative overflow-hidden
   */
  as?: string
}
export const WScroll = (_props: WScrollProps) => {
  const [props, restProps] = splitProps(_props, ['as'])

  return <Dynamic component={props.as ?? 'div'} {...restProps} />
}
