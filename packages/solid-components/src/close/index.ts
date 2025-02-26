import {freeze} from '@winter-love/utils'
import {HCloseRoot} from './HCloseRoot'
import {HCloseBody} from './HCloseBody'

export * from './HCloseRoot'
export * from './context'

export const HClose = freeze({
  Body: HCloseBody,
  Root: HCloseRoot,
})
