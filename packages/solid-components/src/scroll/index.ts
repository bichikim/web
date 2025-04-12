import {WScrollRoot} from './WScrollRoot'
import {WScrollBody} from './WScrollBody'
import {WScrollBar} from './WScrollBar'
import {WScrollHandle} from '../scroll/WScrollHandle'

const WScroll = {
  Bar: WScrollBar,
  Body: WScrollBody,
  Handle: WScrollHandle,
  Root: WScrollRoot,
}

export {WScroll}

export {type WScrollRootProps} from './WScrollRoot'
export {type WScrollBodyProps} from './WScrollBody'
export {type WScrollBarProps} from './WScrollBar'
export {type WScrollHandleProps} from './WScrollHandle'
