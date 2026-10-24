import {freeze} from '@winter-love/utils'
import {ResizeCardProvider} from './ResizeCardProvider'
import {ResizeCardHandle} from './ResizeCardHandle'
import {ResizeCardBody} from './ResizeCardBody'

export * from './ResizeCardBody'
export * from './ResizeCardHandle'
export * from './ResizeCardProvider'

export const ResizeCard = freeze({
  Body: ResizeCardBody,
  Handle: ResizeCardHandle,
  Provider: ResizeCardProvider,
})
