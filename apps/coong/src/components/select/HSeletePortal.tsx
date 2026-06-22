import type {ParentProps} from 'solid-js'
import {Portal} from 'solid-js/web'

export interface HSelectPortalProps extends ParentProps {}

export const HSelectPortal = (props: HSelectPortalProps) => {
  return <Portal>{props.children}</Portal>
}
