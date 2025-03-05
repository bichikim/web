import {freeze} from '@winter-love/utils'
import {ButtonBody} from './ButtonBody'
import {ButtonProvider} from './ButtonProvider'

export * from './ButtonBody'
export * from './ButtonProvider'
export * from './HButton'
export * from './context'

export const Button = freeze({
  Body: ButtonBody,
  Provider: ButtonProvider,
})
