import {freeze} from '@winter-love/utils'
import {DragButtonBody} from './DragButtonBody'
import {DragButtonAside} from './DragButtonAside'
import {DragButtonContent} from './DragButtonContent'
import {DragButtonProvider} from './DragButtonProvider'

export * from './DragButtonAside'
export * from './DragButtonBody'
export * from './DragButtonContent'
export * from './DragButtonProvider'
export * from './HDragButton'

export const DragButton = freeze({
  Aside: DragButtonAside,
  Body: DragButtonBody,
  Content: DragButtonContent,
  Provider: DragButtonProvider,
})
