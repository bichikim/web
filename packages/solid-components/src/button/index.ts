import {freeze} from '@winter-love/utils'
import {ButtonBody} from './ButtonBody'
import {ButtonRoot} from './ButtonRoot'

export * from './ButtonBody'
export * from './ButtonRoot'
export * from './HButton'
export * from './context'

export const Button = freeze({
  Body: ButtonBody,
  Root: ButtonRoot,
})
