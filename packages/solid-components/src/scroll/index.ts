import {SScrollRoot} from './SScrollRoot'
import {SScrollBody} from './SScrollBody'
import {SScrollBar} from './SScrollBar'
import {SScrollHandle} from '../scroll/SScrollHandle'

const SScroll = {
  Bar: SScrollBar,
  Body: SScrollBody,
  Handle: SScrollHandle,
  Root: SScrollRoot,
}

export {SScroll}

export {type SScrollRootProps} from './SScrollRoot'
export {type SScrollBodyProps} from './SScrollBody'
export {type SScrollBarProps} from './SScrollBar'
export {type SScrollHandleProps} from './SScrollHandle'
