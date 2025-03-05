import {freeze} from '@winter-love/utils'
import {CloseProvider} from './CloseProvider'
import {CloseBody} from './CloseBody'

export * from './context'

export const Close = freeze({
  Body: CloseBody,
  Provider: CloseProvider,
})
