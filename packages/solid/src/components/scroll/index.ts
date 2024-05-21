import {WScrollRoot, type WScrollRootProps} from './WScrollRoot'
import {WScrollBody, type WScrollBodyProps} from './WScrollBody'
import {WScrollBar, type WScrollBarProps} from './WScrollBar'
import {WScrollHandle, type WScrollHandleProps} from 'src/components/scroll/WScrollHandle'

const WScroll = {
  Bar: WScrollBar,
  Body: WScrollBody,
  Handle: WScrollHandle,
  Root: WScrollRoot,
}

export {WScroll, WScrollRootProps, WScrollHandleProps, WScrollBarProps, WScrollBodyProps}
