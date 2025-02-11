import {freeze} from '@winter-love/utils'
import {DragButtonBody} from './DragButtonBody'
import {DragButtonAside} from './DragButtonAside'
import {DragButtonContent} from './DragButtonContent'
import {DragButtonRoot} from './DragButtonRoot'

export * from './DragButtonAside'
export * from './DragButtonContent'
export * from './DragButtonRoot'
export * from './HDragButton'

export const DragButton = freeze({
  Aside: DragButtonAside,
  Body: DragButtonBody,
  Content: DragButtonContent,
  Root: DragButtonRoot,
})
