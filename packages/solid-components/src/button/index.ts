import {freeze} from '@winter-love/utils'
import {HButtonBody} from './HButtonBody'
import {HButtonRoot} from './HButtonRoot'

export * from './HButton'
export * from './HButtonBody'
export * from './HButtonRoot'

export const Button = freeze({
  Body: HButtonBody,
  Root: HButtonRoot,
})
