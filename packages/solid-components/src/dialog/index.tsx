import {freeze} from '@winter-love/utils'
import {DialogOverlay} from './DialogOverlay'
import {DialogProvider} from './DialogProvider'

export * from './DialogOverlay'
export * from './DialogProvider'

export const Dialog = freeze({
  Overlay: DialogOverlay,
  Provider: DialogProvider,
})
