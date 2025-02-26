import {freeze} from '@winter-love/utils'
import {HDialogOverlay} from './HDialogOverlay'
import {HDialogRoot} from './HDialogRoot'

export * from './HDialogOverlay'
export * from './HDialogRoot'

export const Dialog = freeze({
  Overlay: HDialogOverlay,
  Root: HDialogRoot,
})
